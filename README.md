# Archived

> By December 1, 2023, users will no longer be able to invoke Clyde in DMs, Group DMs or server chats.

[Discord Support Article](https://support.discord.com/hc/en-us/articles/13066317497239)

---

# Discord Clyde API

An extremely simple, proof-of-concept HTTP/REST API for Discord's Clyde bot. This is not meant to be used in production at all - you may be rate-limited or banned from Discord for using this.

## Usage

### Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file with the following contents:

```ini
# A Discord ACCOUNT token, not a bot token.
TOKEN=your_discord_account_token
# ID of a DEDICATED server with:
# - Clyde enabled
# - Administrator permissions
# The script will delete all channels in the server if it's over Discord's channel limit!
SERVER_ID=your_server_id
# Server port
PORT=3000
# Uncomment this if you want to enable CORS
# It's recommended to change this to a specific origin instead of "*"
#CORS_ORIGIN="*"
# Uncomment to enable rate limiting
# Change the value to the maximum number of requests per second
#RATELIMIT_MAX_RPS=10
# Clyde's user ID, don't uncomment or change this unless it has been changed by Discord
#CLYDE_USER_ID=""
```

4. Run the server with `npm start`

### Endpoints

1. GET `/`

It takes 2 query parameters, `message` (which is the message you want Clyde to say) and `conversationID` (a channel name for this conversation, used by Clyde for context).

For example, if you want to ask Clyde "Hello", you would send a GET request to `/?message=Hello&conversationID=exampleid`.

2. DELETE `/`

Takes one query parameter, `conversationID`, which is the conversation (channel) you want to delete.

3. GET `/healthcheck`

Returns a 200 OK if the server is running, the JSON response also contains information about whether it's connected to Discord or not.

## How it works

It's pretty simple - the API uses your Discord account token to log in as you, and then sends a message to Clyde in the specified server. Clyde then responds to the message, and the API returns the response.

It creates a new channel for each conversation, so context is preserved and Clyde can respond to multiple conversations at once. There's a limit of 450 conversations at once, since that's close to the maximum number of channels a server can have (500). If you go over this limit, the API will delete all channels in the server and start over.
