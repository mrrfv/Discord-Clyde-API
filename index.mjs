import 'dotenv/config';
import Discord from 'discord.js-selfbot-v13';
import Fastify from 'fastify';
import cors from '@fastify/cors'

// Initialize Discord
const client = new Discord.Client();
let discord_ready = false;
let clyde_user_id = process.env.CLYDE_USER_ID || '1081004946872352958';

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    discord_ready = true;
    // Prune channels on startup
    pruneChannels(process.env.SERVER_ID);
});

async function sendMessageToChannel(id, message) {
    const channel = await client.channels.fetch(id);
    channel.send(message);
}

async function createChannelinServer(serverId, channelName) {
    const server = await client.guilds.fetch(serverId);
    const channel = await server.channels.create(channelName, {
        type: 'text',
        permissionOverwrites: [
            {
                id: server.roles.everyone,
                deny: ['VIEW_CHANNEL'],
            },
        ],
    });
    return channel;
}

async function getChannelByName(serverId, channelName) {
    const server = await client.guilds.fetch(serverId);
    const channels = await server.channels.fetch();
    const channel = channels.find(channel => channel.name === channelName);
    return channel;
}

// Delete all channels in a server
async function deleteAllChannels(serverId) {
    const server = await client.guilds.fetch(serverId);
    const channels = await server.channels.fetch();
    channels.forEach(async channel => {
        console.log(`Deleting channel ${channel.name}`);
        await channel.delete();
    });
}

// Function to get the amount of channels in a server
async function getChannelCount(serverId) {
    const server = await client.guilds.fetch(serverId);
    const channels = await server.channels.fetch();
    return channels.size;
}

// Function that deletes all channels if the channel count is greater than the max (default 450)
async function pruneChannels(serverId, max = 450) {
    const channelCount = await getChannelCount(serverId);
    if (channelCount > max) {
        console.log(`Channel count is ${channelCount}, deleting all channels...`)
        await deleteAllChannels(serverId);
    } else {
        console.log(`Channel count is ${channelCount}, not deleting channels.`)
    }
}

// Prune channels every 15 minutes
setInterval(() => {
    pruneChannels(process.env.SERVER_ID);
}, 15 * 60 * 1000);

// Initialize Fastify
const fastify = Fastify({ logger: true });

// Register CORS
await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || false,
})

// Register rate limiter
if (process.env.RATELIMIT_MAX_RPS) {
    const ratelimit_max = parseInt(process.env.RATELIMIT_MAX_RPS) || 4;
    console.log(`Rate limiting to ${ratelimit_max} requests per second`);
    await fastify.register(import('@fastify/rate-limit'), {
        max: ratelimit_max,
        timeWindow: '1 second'
    });
} else {
    console.log(`Rate limiting disabled`);
}

// Health check route
fastify.get('/healthcheck', async (request, reply) => {
    reply.send({
        status: discord_ready ? 'ok' : 'not ready',
    });
});

// Route to send a message
fastify.get('/', async (request, reply) => {
    // Ensure Discord is ready
    if (!discord_ready) {
        reply.send({
            error: 'Discord is not ready yet',
        });
        return;
    }

    const message = request.query.message;
    const conversationID = request.query.conversationID.toLowerCase();

    // Make sure message and conversationID are provided
    if (!message || !conversationID) {
        reply.send({
            error: 'Please provide a message and conversationID',
        });
        return;
    }

    // Ensure message is under 1850 characters
    if (message.length > 1850) {
        reply.send({
            error: 'Message is too long. Must be under 1850 characters',
        });
        return;
    }

    // Validate that the conversationID is a string with only letters and numbers, no spaces and no more than 32 characters
    // If not, return an error
    if (!/^[a-zA-Z0-9]{1,32}$/.test(conversationID)) {
        reply.send({
            error: 'Invalid conversationID. Must be a string with only letters and numbers, no spaces and no more than 32 characters',
        });
        return;
    }

    // Check if conversation exists
    let channel = await getChannelByName(process.env.SERVER_ID, conversationID);
    if (!channel) {
        // Create channel
        channel = await createChannelinServer(process.env.SERVER_ID, conversationID);
    }

    // Send message to channel
    await sendMessageToChannel(channel.id, `<@${clyde_user_id}> ${message}`);

    // Wait for response from Clyde
    const response = await new Promise((resolve, reject) => {
        // TODO: We might want to end the promise after a certain amount of time
        // as well as to stop listening for messages after we get a response
        client.on('messageCreate', msg => {
            if (msg.channel.id === channel.id && msg.author.id === clyde_user_id) {
                resolve(msg.content);
            }
        });
    });

    // Return response to the client
    reply.send({
        response: response,
    });
});

// Route to delete a conversation
fastify.delete('/', async (request, reply) => {
    // Ensure Discord is ready
    if (!discord_ready) {
        reply.send({
            error: 'Discord is not ready yet',
        });
        return;
    }

    const conversationID = request.query.conversationID.toLowerCase();

    // Make sure conversationID is provided
    if (!conversationID) {
        reply.send({
            error: 'Please provide a conversationID',
        });
        return;
    }

    // Validate that the conversationID is a string with only letters and numbers, no spaces and no more than 32 characters
    // If not, return an error
    if (!/^[a-zA-Z0-9]{1,32}$/.test(conversationID)) {
        reply.send({
            error: 'Invalid conversationID. Must be a string with only letters and numbers, no spaces and no more than 32 characters',
        });
        return;
    }

    // Check if conversation exists
    let channel = await getChannelByName(process.env.SERVER_ID, conversationID);
    if (!channel) {
        reply.send({
            error: 'Conversation does not exist',
        });
        return;
    }

    // Delete channel
    await channel.delete();

    // Return response to the client
    reply.send({
        response: 'Conversation deleted',
        success: true,
    });
});

// Login to Discord
client.login(process.env.TOKEN);
// Start Fastify
fastify.listen({ port: process.env.PORT || 53195 });