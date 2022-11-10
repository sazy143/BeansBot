import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  VoiceConnection,
} from "@discordjs/voice";
import { Guild, VoiceBasedChannel } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
import ytdl from "ytdl-core";

interface PlayersAndQueues {
  [index: string]: {
    player: AudioPlayer;
    queue: string[];
  };
}

let playersAndQueues: PlayersAndQueues = {};

export function play(
  guild: Guild,
  song: string,
  voiceChannel: VoiceBasedChannel
) {
  setUpVoiceConnectionAndPlayer(voiceChannel);

  let { player, queue } = playersAndQueues[voiceChannel.id];

  queue.push(song);

  if (player.state.status === AudioPlayerStatus.Idle) {
    const resource = createNextAudioResource(voiceChannel.id);
    player.play(resource!);
  }
}

const setUpVoiceConnectionAndPlayer = (
  channel: VoiceBasedChannel
): VoiceConnection => {
  let connection = getVoiceConnection(channel.id);

  if (connection) {
    return connection;
  }

  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();
  setupPlayerEvents(player, channel.id);
  playersAndQueues[channel.id] = { player, queue: [] };

  connection.subscribe(player);

  return connection;
};

const createNextAudioResource = (channelId: string): AudioResource | null => {
  const nextSong = playersAndQueues[channelId].queue.shift();

  if (!nextSong) {
    return null;
  }

  let link = getYoutubeLinkFromTitle(nextSong);

  const stream = ytdl(link, { filter: "audioonly", highWaterMark: 1 << 25 });

  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
  });

  return resource;
};

const getYoutubeLinkFromTitle = (song: string): string => {
  //TODO: integrate with youtube/google api to get url from text title
  return song;
};

const setupPlayerEvents = (player: AudioPlayer, channelId: string) => {
  player.on(AudioPlayerStatus.Idle, () => {
    const resource = createNextAudioResource(channelId);
    if (resource) {
      player.play(resource);
    }
    //TODO: No more songs set timer for self destruct
  });
  player.on("error", (err) => {
    console.log(err);
  });
};
