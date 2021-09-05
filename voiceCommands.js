const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const got = require("got");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

class voicePlayer {
  //same as queue behind scenes
  play = async (GUILD, voiceChannel, textChannel, song) => {
    if (GUILD.connection == null) {
      const player = createAudioPlayer();
      const connection = await this.connectToChannel(voiceChannel);
      connection.on("error", (err) => console.log(err));
      connection.subscribe(player);
      GUILD.connection = connection;
      GUILD.audioPlayer = player;
      GUILD.songQueue.push(song);
      this.attachRecorder(GUILD, textChannel);
    } else {
      GUILD.songQueue.push(song);
    }
  };
  skip = (GUILD) => {
    if (GUILD.audioPlayer != null) {
      GUILD.audioPlayer.stop();
    }
  };
  remove = (GUILD, index) => {
    if (
      index <= GUILD.songQueue.length &&
      GUILD.songQueue.length > 0 &&
      index > 0
    ) {
      GUILD.songQueue.splice(index - 1, 1);
    }
  };
  move = (GUILD, start, end) => {
    if (
      start <= GUILD.songQueue.length &&
      end <= GUILD.songQueue.length &&
      start > 0 &&
      end > 0 &&
      GUILD.songQueue.length > 0
    ) {
      let temp = GUILD.songQueue[start - 1];
      GUILD.songQueue[start - 1] = GUILD.songQueue[end - 1];
      GUILD.songQueue[end - 1] = temp;
    }
  };
  clear = (GUILD) => {
    GUILD.songQueue = [];
  };
  pause = (GUILD) => {
    if (GUILD.audioPlayer != null) {
      GUILD.audioPlayer.pause();
    }
  };
  resume = (GUILD) => {
    if (GUILD.audioPlayer != null) {
      GUILD.audioPlayer.unpause();
    }
  };
  list = (GUILD, textChannel) => {
    let list = GUILD.songQueue.slice(0, 20).map((song, index) => {
      return `${index}. ${song}`;
    });
    textChannel.send(list);
  };

  attachRecorder(GUILD, textChannel) {
    let song = GUILD.songQueue.shift();
    if (!song) {
      GUILD.connection.destroy();
      GUILD.connection = null;
      GUILD.audioPlayer = null;
      return;
    }
    let videoTitle,
      url = this.getTitleAndURL(song);
    const stream = ytdl(url, { filter: "audioonly", highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });
    textChannel.send(`Now playing ${videoTitle}`);
    GUILD.audioPlayer.play(resource);
    GUILD.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      console.log("next song");
      this.attachRecorder(GUILD, textChannel);
    });
    GUILD.audioPlayer.on("error", (err) => console.log(err));
    return entersState(GUILD.audioPlayer, AudioPlayerStatus.Playing, 10e3);
  }
  async connectToChannel(channel) {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      return connection;
    } catch (error) {
      connection.destroy();
      throw error;
    }
  }
  async getTitleAndURL(song) {
    //youtube search uses + as spaces
    song.replace(" ", "+");
    const url = "https://www.youtube.com/results?search_query=" + song;
    const response = await got(url);
    const dom = new JSDOM(response.body);
    let elements = [...dom.window.document.querySelectorAll("#video-title")];
    console.log(elements);
    let title = elements[0].title;
    let link = elements[0].href;
    return [title, link];
  }
}

exports.voicePlayer = voicePlayer;
