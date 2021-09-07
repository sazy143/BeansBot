const { token } = require("./config.json");
const { Client } = require("discord.js");
const { voicePlayer } = require("./voiceCommands");
const { syncCommands } = require("./deploy-commands");

const voiceplayer = new voicePlayer();

let GUILDS = {};

const client = new Client({
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"],
});

client.once("ready", async () => {
  //Initialize our GUILDS dictionary
  await client.guilds.cache.map(async (guild) => {
    //await syncCommands(guild.id);

    GUILDS[guild] = {
      audioPlayer: null,
      songQueue: [],
      connection: null,
    };
  });
  console.log(GUILDS);
  console.log("Ready!");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;
  let GUILD = GUILDS[interaction.guild];
  const voiceChannel = interaction.member?.voice.channel;
  const textChannel = interaction.channel;
  switch (commandName) {
    case "ping":
      await interaction.reply("Pong!");
      break;
    case "server":
      await interaction.reply(
        `Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`
      );
      break;
    case "user":
      await interaction.reply(
        `Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`
      );
      break;
    case "beans":
      await interaction.reply({ files: ["./beanImgs/Beans1.jpg"] });
      break;
    case "play":
      await interaction.deferReply();
      var song = "";
      for (var item of interaction.options._hoistedOptions) {
        if (item.name === "song") {
          song = item.value;
          break;
        }
      }

      if (song.trim().length == 0) {
        await interaction.reply("That is not a song!");
      }
      if (voiceChannel) {
        try {
          await voiceplayer.play(GUILD, voiceChannel, textChannel, song);
          await interaction.editReply(`Queued ${song}`);
          return;
        } catch (error) {
          console.error(error);
          return;
        }
      } else {
        await interaction.reply("Join a voice channel then try again!");
      }
    case "skip":
      voiceplayer.skip(GUILD);
      interaction.reply("Song skipped!");
      break;
    case "remove":
      var index = "";
      for (var item of interaction.options._hoistedOptions) {
        if (item.name === "index") {
          index = item.value;
          break;
        }
      }
      voiceplayer.remove(GUILD, index);
      interaction.reply("Song removed!");
      break;
    case "move":
      var currentindex = "";
      var newindex = "";
      for (var item of interaction.options._hoistedOptions) {
        if (item.name === "currentindex") {
          currentindex = item.value;
        }
        if (item.name === "newindex") {
          newindex = item.value;
        }
      }
      voiceplayer.move(GUILD, currentindex, newindex);
      await interaction.reply("Song moved!");
      break;
    case "clear":
      voiceplayer.clear(GUILD);
      await interaction.reply("Queue cleared!");
      break;
    case "pause":
      voiceplayer.pause(GUILD);
      await interaction.reply("Paused!");
      break;
    case "resume":
      voiceplayer.resume(GUILD);
      await interaction.reply("Resumed!");
      break;
    case "list":
      let page = 0;
      for (var item of interaction.options._hoistedOptions) {
        if (item.name === "page") {
          page = item.value;
          break;
        }
      }
      voiceplayer.list(GUILD, textChannel, page);
      break;
  }
});

client.login(token);
