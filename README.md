Welcome to the BeansBot!

Beans bot is a discord bot for playing music on a discord server.

It is very simple and a very low code solution, that also has great capabilities.

This is an open source/steal all my code or clone it repo. If you don't like something just change it. There are a few things that are required for this code to run.

1. A discord bot. You can find out how to create one and add it to a server from discord. A quick search for "discord developer portal" should set you up nice.
2. From the portal take the application Id and the public key. Create a .env file in the base directory based off of the .env-example file. For applicationId and token set the values to the application id, and the public key. This will let the bot set the commands on the servers its added to, and initialize itself.
3. This bot uses youtube to play music, and makes use of the youtube api to turn song names like "heat waves" into their youtube url "https://www.youtube.com/watch?v=KT7F15T9VBI", which can be streamed to your discord server. While the streaming part is unlimited till youtube bans your ip for abuse the part that gets the url is not. You need an api key, and that is limited to 100 searches a day. However you can add multiple keys to increase that. You can create a key by going to https://console.cloud.google.com/apis/dashboard from there go to credentials, and create a credential (api key). Paste that key into the googleKey[index] variable in the .env file. You then go back to the enable apis and services tab, and need to enable the "YouTube Data API v3"
4. After that add the bot to your server, give it the necessary permissions, and run the start command. On first run make sure to uncomment line 29 in index.ts, but once your server has the commands you can comment that line out again.

Requirements to run.

1. Node v18 or greater
2. Run "yarn install" then "yarn start" and you're off to the races.

Stuff may break. I probably won't fix, but if you fix it make a PR, and I may review it.
