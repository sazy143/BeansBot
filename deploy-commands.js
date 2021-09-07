const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { clientId, token } = require("./config.json");

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with pong!"),
  new SlashCommandBuilder()
    .setName("server")
    .setDescription("Replies with server info!"),
  new SlashCommandBuilder()
    .setName("user")
    .setDescription("Replies with user info!"),
  new SlashCommandBuilder()
    .setName("beans")
    .setDescription("Sends you some beans!"),
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays requested song.")
    .addStringOption((option) =>
      option
        .setName("song")
        .setDescription("Literally just the song name.")
        .setRequired(true)
    ),
  new SlashCommandBuilder().setName("skip").setDescription("Next Song!"),
  new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Removes a song from the queue.")
    .addIntegerOption((option) =>
      option
        .setName("index")
        .setDescription("The index of the song in the queue.")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("move")
    .setDescription("Switch the spot of two songs.")
    .addIntegerOption((option) =>
      option
        .setName("currentindex")
        .setDescription("Initial Index.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("newindex")
        .setDescription("Final Index.")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clears the queue."),
  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause playback use /resume to continue."),
  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resumes the audio."),
  new SlashCommandBuilder()
    .setName("list")
    .setDescription("Lists the next 20 songs in the queue.")
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setDescription("Page of songs to show.")
        .setRequired(false)
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: "9" }).setToken(token);

let syncCommands = async (guildID) => {
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildID), {
      body: commands,
    });

    console.log("Successfully registered application commands.");
  } catch (error) {
    console.error(error);
  }
};

exports.syncCommands = syncCommands;
