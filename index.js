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
  client.guilds.cache.map(async (guild) => {
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
  //console.log(util.inspect(interaction, false, null, true /* enable colors */))
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
      var song = "";
      for (var item of interaction.options._hoistedOptions) {
        if (item.name === "song") {
          song = item.value;
          break;
        }
        interaction.reply();
      }

      const voiceChannel = interaction.member?.voice.channel;
      const textChannel = interaction.channel;

      if (song.trim().length == 0) {
        await interaction.reply("That is not a song!");
      }
      if (voiceChannel) {
        try {
          let GUILD = GUILDS[interaction.guild];
          await voiceplayer.play(GUILD, voiceChannel, textChannel, song);
        } catch (error) {
          console.error(error);
        }
      } else {
        await interaction.reply("Join a voice channel then try again!");
      }
  }
});

client.login(token);
