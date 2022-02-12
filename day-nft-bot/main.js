const { Client, Intents, Collection } = require('discord.js');
const { checkEmeraldIdentityDiscord} = require('./flowscripts/emerald_identity.js');
const fs = require('fs');
const fcl = require("@onflow/fcl");

const prefix = '!';
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// Gets all of our commands from our commands folder
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log('DayNFT bot is online!');
})

// When a user types a message
client.on('messageCreate', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'test') {
        message.channel.send('Testing!');
    } else if (command === 'showcase') {
        client.commands.get('showcase').execute(message, args);
    }
});


// This is the bot's token
// Must be at the bottom of the file
client.login(process.env.TOKEN);
