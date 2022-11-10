import { Events, Guild, Interaction } from "discord.js";
import { syncCommands } from "./deploy-commands";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { play } from "./voicesInMyHead";
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
    //update all commands (Don't always need to run)
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
    case "server":
      await interaction.reply(
        `Server name: ${guild?.name}\nTotal members: ${guild?.memberCount}`
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
      play(guild!, song, voiceChannel);
      return; //await interaction.deleteReply();
    // case "skip":
    //   voiceplayer.skip(GUILD);
    //   interaction.reply("Song skipped!");
    //   break;
    // case "remove":
    //   var index = "";
    //   for (var item of interaction.options._hoistedOptions) {
    //     if (item.name === "index") {
    //       index = item.value;
    //       break;
    //     }
    //   }
    //   voiceplayer.remove(GUILD, index);
    //   interaction.reply("Song removed!");
    //   break;
    // case "move":
    //   var currentindex = "";
    //   var newindex = "";
    //   for (var item of interaction.options._hoistedOptions) {
    //     if (item.name === "currentindex") {
    //       currentindex = item.value;
    //     }
    //     if (item.name === "newindex") {
    //       newindex = item.value;
    //     }
    //   }
    //   voiceplayer.move(GUILD, currentindex, newindex);
    //   await interaction.reply("Song moved!");
    //   break;
    // case "clear":
    //   voiceplayer.clear(GUILD);
    //   await interaction.reply("Queue cleared!");
    //   break;
    // case "pause":
    //   voiceplayer.pause(GUILD);
    //   await interaction.reply("Paused!");
    //   break;
    // case "resume":
    //   voiceplayer.resume(GUILD);
    //   await interaction.reply("Resumed!");
    //   break;
    // case "list":
    //   await interaction.reply("Gathering List...");
    //   await interaction.deleteReply();
    //   let page = 0;
    //   for (var item of interaction.options._hoistedOptions) {
    //     if (item.name === "page") {
    //       page = item.value;
    //       break;
    //     }
    //   }
    //   voiceplayer.list(GUILD, textChannel, page);
    //   break;
    // case "shuffle":
    //   await interaction.reply("Shuffling Queue...");
    //   await interaction.deleteReply();
    //   voiceplayer.shuffle(GUILD, textChannel);
    //   break;
  }
});

client.login(process.env.token);
