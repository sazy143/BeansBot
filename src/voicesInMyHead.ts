import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import {
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
  VoiceBasedChannel,
} from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
import ytdl from "ytdl-core";
import dotenv from "dotenv";

dotenv.config();

interface PlayersAndQueues {
  [index: string]: {
    player: AudioPlayer;
    queue: string[];
  };
}

let playersAndQueues: PlayersAndQueues = {};

export async function play(song: string, voiceChannel: VoiceBasedChannel) {
  setUpVoiceConnectionAndPlayer(voiceChannel);

  let { player, queue } = playersAndQueues[voiceChannel.id];

  queue.push(song);

  if (player.state.status === AudioPlayerStatus.Idle) {
    const resource = await createNextAudioResource(voiceChannel.id);
    player.play(resource!);
  }
}
export function skip(
  voiceChannel: VoiceBasedChannel,
  interaction:
    | ChatInputCommandInteraction
    | MessageContextMenuCommandInteraction
    | UserContextMenuCommandInteraction
) {
  let { player, queue } = playersAndQueues[voiceChannel.id];
  if (player && player.state.status !== AudioPlayerStatus.Idle) {
    player.stop();
    interaction.reply("song skipped");
    return;
  }
  interaction.reply("nothing to skip");
}

export function remove(index: number, voiceChannel: VoiceBasedChannel) {
  let { player, queue } = playersAndQueues[voiceChannel.id];
  queue.splice(index, 1);
}

export function move(
  currentIndex: number,
  newIndex: number,
  voiceChannel: VoiceBasedChannel
) {
  let { player, queue } = playersAndQueues[voiceChannel.id];

  let temp = queue[currentIndex];
  queue[currentIndex] = queue[newIndex];
  queue[newIndex] = temp;
}

export function clear(voiceChannel: VoiceBasedChannel) {
  let { player, queue } = playersAndQueues[voiceChannel.id];
  queue.length = 0;
}

export function pause(
  voiceChannel: VoiceBasedChannel,
  interaction:
    | ChatInputCommandInteraction
    | MessageContextMenuCommandInteraction
    | UserContextMenuCommandInteraction
) {
  let { player, queue } = playersAndQueues[voiceChannel.id];

  if (player && player.state.status === AudioPlayerStatus.Playing) {
    player.pause();
    interaction.reply("Song paused");
    return;
  }

  interaction.reply("Issue pausing audio");
}

export function resume(
  voiceChannel: VoiceBasedChannel,
  interaction:
    | ChatInputCommandInteraction
    | MessageContextMenuCommandInteraction
    | UserContextMenuCommandInteraction
) {
  let { player, queue } = playersAndQueues[voiceChannel.id];

  if (player && player.state.status === AudioPlayerStatus.Paused) {
    player.unpause();
    interaction.reply("Audio resumed");
    return;
  }

  interaction.reply("Issue resuming audio");
}

export function list(
  page: number,
  voiceChannel: VoiceBasedChannel,
  interaction:
    | ChatInputCommandInteraction
    | MessageContextMenuCommandInteraction
    | UserContextMenuCommandInteraction
) {
  let { player, queue } = playersAndQueues[voiceChannel.id];

  if (queue.length == 0) {
    interaction.reply("No songs in the queue.");
    return;
  }
  let lastPage = Math.floor((queue.length - 1) / 20);
  if (page > lastPage) {
    page = lastPage;
  }
  let list = "";
  queue.slice(20 * page, 20 * (page + 1)).map((song, index) => {
    list += `${page * 20 + index}. ${song} \n`;
  });
  interaction.reply(list);
}

const setUpVoiceConnectionAndPlayer = (
  channel: VoiceBasedChannel
): VoiceConnection => {
  let connection = getVoiceConnection(channel.guild.id);

  if (connection) {
    return connection;
  }

  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });

  setupConnectionEvents(connection);

  const player = createAudioPlayer();
  setupPlayerEvents(player, channel.id, connection);
  playersAndQueues[channel.id] = { player, queue: [] };

  connection.subscribe(player);

  return connection;
};

const createNextAudioResource = async (
  channelId: string
): Promise<AudioResource | null> => {
  const nextSong = playersAndQueues[channelId].queue.shift();

  if (!nextSong) {
    return null;
  }

  let link = await getYoutubeLinkFromTitle(nextSong);

  const stream = ytdl(link, { filter: "audioonly", highWaterMark: 1 << 25 });

  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
  });

  return resource;
};

const getYoutubeLinkFromTitle = async (song: string): Promise<string> => {
  let apiAddress =
    "https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=" +
    song +
    "&key=" +
    getRandomGoogleAPIKey();
  const response = await fetch(apiAddress);
  const result = await response.json();
  let url = "https://www.youtube.com/watch?v=" + result.items[0].id.videoId;

  return url;
};

const getRandomGoogleAPIKey = () => {
  return process.env[
    "googleKey" + Math.floor(Math.random() * +process.env.googleKeyCount)
  ];
};

const setupPlayerEvents = (
  player: AudioPlayer,
  channelId: string,
  connection: VoiceConnection
) => {
  let timeoutId: any;
  player.on(AudioPlayerStatus.Idle, async () => {
    const resource = await createNextAudioResource(channelId);
    if (resource) {
      player.play(resource);
    }
    timeoutId = setTimeout(() => {
      connection.destroy();
    }, 180000);
  });
  player.on("error", (err) => {
    console.log(err);
  });
  player.on(AudioPlayerStatus.Playing, () => {
    clearTimeout(timeoutId);
  });
};

const setupConnectionEvents = (connection: VoiceConnection) => {
  connection.on(
    VoiceConnectionStatus.Disconnected,
    async (oldState, newState) => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // Seems to be reconnecting to a new channel - ignore disconnect
      } catch (error) {
        // Seems to be a real disconnect which SHOULDN'T be recovered from
        console.log(error);
        connection.destroy();
      }
    }
  );
};
