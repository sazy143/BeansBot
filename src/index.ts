import { Events, Guild, Interaction } from "discord.js";
import { syncCommands } from "./deploy-commands";
import { Client, GatewayIntentBits } from "discord.js";
import {
  clear,
  list,
  move,
  pause,
  play,
  remove,
  resume,
  skip,
} from "./voicesInMyHead";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once(Events.ClientReady, async () => {
  client.guilds.cache.map(async (guild: Guild) => {
    //update all commands across all servers (Don't always need to run)
    //await syncCommands(guild.id);
  });
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;

  const guild = client.guilds.cache.get(interaction.guildId || "");
  const member = guild!.members.cache.get(interaction.member!.user.id);
  const voiceChannel = member!.voice.channel;

  switch (interaction.commandName) {
    case "ping":
      await interaction.reply("Pong!");
      break;
    case "play":
      await interaction.deferReply();

      if (!voiceChannel) {
        await interaction.editReply("Join a voice channel first.");
        return;
      }

      var song = interaction.options.get("song")?.value?.toString();

      if (!song || song.trim().length == 0) {
        await interaction.editReply("That is not a song!");
        return;
      }

      await interaction.editReply("Attempting to queue " + song);
      play(song, voiceChannel);
      await interaction.deleteReply();
      return;
    case "skip":
      if (voiceChannel) {
        skip(voiceChannel, interaction);
        break;
      }
      interaction.reply("Not in a voice channel");
      break;
    case "remove":
      var index = interaction.options.get("index")?.value;
      if (typeof index != "number") {
        interaction.reply("Invalid input");
        break;
      }
      remove(index, voiceChannel);
      interaction.reply("Song removed!");
      break;
    case "move":
      var currentIndex = interaction.options.get("currentindex")?.value;
      var newIndex = interaction.options.get("newindex")?.value;

      if (typeof currentIndex != "number" || typeof newIndex != "number") {
        interaction.reply("Invalid input");
        break;
      }

      move(currentIndex, newIndex, voiceChannel);
      await interaction.reply("Song moved!");
      break;
    case "clear":
      clear(voiceChannel);
      await interaction.reply("Queue cleared!");
      break;
    case "pause":
      pause(voiceChannel, interaction);
      break;
    case "resume":
      resume(voiceChannel, interaction);
      break;
    case "list":
      let page = interaction.options.get("page")?.value;

      if (typeof page != "number") {
        interaction.reply("Invalid input");
        break;
      }
      list(page, voiceChannel, interaction);
      break;
  }
});

client.on(Events.Error, (error) => {
  console.log(error);
});

client.login(process.env.token);
