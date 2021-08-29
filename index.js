const { token } = require('./config.json');
const ytdl = require('ytdl-core');
const { Client, VoiceChannel, Intents } = require('discord.js');
const {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	entersState,
	StreamType,
	AudioPlayerStatus,
	VoiceConnectionStatus,
} = require('@discordjs/voice');
const util = require('util')

const client = new Client({ intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_VOICE_STATES'] });

const player = createAudioPlayer();

player.on('stateChange', (oldState, newState) => {
	if (oldState.status === AudioPlayerStatus.Idle && newState.status === AudioPlayerStatus.Playing) {
		console.log('Playing audio output on audio player');
	} else if (newState.status === AudioPlayerStatus.Idle) {
		console.log('Playback has stopped. Attempting to restart.');
		attachRecorder();
	}
});

player.on('stateChange', (oldState, newState) => {
	if (oldState.status === AudioPlayerStatus.Idle && newState.status === AudioPlayerStatus.Playing) {
		console.log('Playing audio output on audio player');
	} else if (newState.status === AudioPlayerStatus.Idle) {
		console.log('Playback has stopped. Attempting to restart.');
		playSong("test");
	}
});

player.on('error', error => {
	console.error(error);
});

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;
    //console.log(util.inspect(interaction, false, null, true /* enable colors */))
    switch(commandName){
        case 'ping':
            await interaction.reply('Pong!');
            break;
        case 'server':
            await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
            break;
        case 'user':
            await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
            break;
        case 'beans':
            await interaction.reply({files: ['./beanImgs/Beans1.jpg']});
            break;
        case 'play':
            const channel = interaction.member?.voice.channel;
            var song = "";
            for(var item of interaction.options._hoistedOptions){
                if(item.name === 'song'){
                    song = item.value;
                    break;
                }
            }
            if(song.trim().length == 0){
                await interaction.reply("That is not a song!");
            }
            if (channel) {
                try {
                    const connection = await connectToChannel(channel);
                    connection.subscribe(player);
                    await attachRecorder();
                    await interaction.reply('Playing now!');
                } catch (error) {
                    console.error(error);
                }
            } else {
                await interaction.reply('Join a voice channel then try again!');
            }
    }
});

function attachRecorder() {

    const stream = ytdl('https://www.youtube.com/watch?v=kudi8OtMu9s&ab_channel=BryceVine', { filter: 'audioonly' });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

	player.play(resource);

	return entersState(player, AudioPlayerStatus.Playing, 5e3);
}
async function connectToChannel(channel) {
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

client.login(token);