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
const config = require("./config.json");
const fetch = import("node-fetch");

class voicePlayer {
  songDiscoveryError = `Could not find requested resource. Supported links are:
  https://open.spotify.com/playlist/\{playlistID\},
  Song Name
  Coming Soon:
  Youtube playlists.`;
  //same as queue behind scenes
  play = async (GUILD, voiceChannel, textChannel, song) => {
    let songs = await this.parseSongInput(song, textChannel);
    GUILD.songQueue = GUILD.songQueue.concat(songs);
    if (GUILD.connection == null) {
      //make sure audioplayer is null
      GUILD.audioPlayer = null;
      const player = createAudioPlayer();
      const connection = await this.connectToChannel(voiceChannel);
      connection.on("error", (err) => console.log(err));
      player.on("error", (err) => console.log(err));
      connection.subscribe(player);
      GUILD.connection = connection;
      GUILD.audioPlayer = player;
      await this.attachRecorder(GUILD, textChannel);
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
    if (GUILD.songQueue.length == 0) {
      textChannel.send("No songs in the queue.");
      return;
    }
    let list = "";
    GUILD.songQueue.slice(20 * page, 20 * (page + 1)).map((song, index) => {
      list += `${page * 20 + index + 1}. ${song} \n`;
    });
    textChannel.send(list);
  };
  shuffle = (GUILD, textChannel) => {
    if (GUILD.songQueue.length == 0) {
      textChannel.send("No songs in the queue.");
      return;
    }
    for (let i = 0; i < GUILD.songQueue.length; i++) {
      let random = Math.floor(Math.random() * GUILD.songQueue.length);
      let temp = GUILD.songQueue[i];
      GUILD.songQueue[i] = GUILD.songQueue[random];
      GUILD.songQueue[random] = temp;
    }
    textChannel.send("Queue reordered.");
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
    console.log(song);
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

  async parseSongInput(song, textChannel) {
    //have a URL check our known sites
    if (song.startsWith("http://") || song.startsWith("https://")) {
      //spotify playlist
      if (song.includes("https://open.spotify.com/playlist/")) {
        //get playlistID
        let playlistID = song.substring(34);
        //incase there is a slash on the end
        playlistID = playlistID.replace("/", "");

        const tokenFetch = await (
          await fetch
        ).default("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            Authorization: "Basic " + config.spotifyBase64Key,
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
          }),
        });
        if (!tokenFetch.ok) {
          textChannel.send(`BeansBot spotify connection error :(`);
          return;
        }
        let tokenJSON = await tokenFetch.json();
        let token = tokenJSON.access_token;

        const songsFetch = await (
          await fetch
        ).default(
          `https://api.spotify.com/v1/playlists/${playlistID}/tracks?fields=items(track(name%2Cartists.name))`,
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + token,
            },
          }
        );
        if (!songsFetch.ok) {
          textChannel.send(this.songDiscoveryError);
          return;
        }
        const songsJSON = await songsFetch.json();
        let songs = songsJSON.items.map((object) => {
          return (
            object.track.name +
            " " +
            object.track.artists.map((artist) => {
              return artist.name + " ";
            })
          );
        });
        textChannel.send(`Queued ${songs.length} songs`);
        return songs;
      }
    }
    textChannel.send(`Queued ${song}`);
    return song;
  }
}

exports.voicePlayer = voicePlayer;
