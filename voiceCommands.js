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
const puppeteer = require("puppeteer");

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
      await this.attachRecorder(GUILD, textChannel);
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
  list = (GUILD, textChannel, page = 0) => {
    let list = "";
    GUILD.songQueue.slice(20 * page, 20 * (page + 1)).map((song, index) => {
      list += `${index + 1}. ${song} \n`;
    });
    console.log(list);
    textChannel.send(list);
  };

  async attachRecorder(GUILD, textChannel) {
    let song = GUILD.songQueue.shift();
    if (!song) {
      if (GUILD.connection == null) {
        return;
      }
      GUILD.connection.destroy();
      GUILD.connection = null;
      GUILD.audioPlayer = null;
      return;
    }
    let songInfo = await this.getTitleAndURL(song);
    let videoTitle = songInfo[0];
    let url = songInfo[1];
    console.log(videoTitle, url);
    const stream = ytdl(url, { filter: "audioonly", highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });
    textChannel.send(`Now playing ${videoTitle}`);
    GUILD.audioPlayer.play(resource);
    GUILD.audioPlayer.once(AudioPlayerStatus.Idle, async () => {
      console.log("next song");
      await this.attachRecorder(GUILD, textChannel);
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

    const browser = await puppeteer.launch({
      headless: true,
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.resourceType() === "image") request.abort();
      else request.continue();
    });
    await page.goto(`https://www.youtube.com/results?search_query=${song}`);

    await page.waitForSelector("div#contents");

    const titles = await page.evaluate(function () {
      return Array.from(
        document.querySelectorAll("ytd-video-renderer a#video-title")
      ).map((el) => ({
        title: el.getAttribute("title"),
        link: "https://www.youtube.com" + el.getAttribute("href"),
      }));
    });
    return [titles[0].title, titles[0].link];
  }
}

exports.voicePlayer = voicePlayer;
