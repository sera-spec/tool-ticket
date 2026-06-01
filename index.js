const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { token } = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.inviteCache = new Map();

// Load commands (flat, no subfolder)
const commandFiles = [
  require('./add-invites'),
  require('./invites'),
  require('./leaderboard'),
  require('./ticket-claim'),
  require('./ticket-panel'),
];
for (const command of commandFiles) {
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// Load events (flat, no subfolder)
const eventFiles = [
  require('./guildMemberAdd'),
  require('./guildMemberRemove'),
  require('./interactionCreate'),
  require('./messageCreate'),
  require('./ready'),
];
for (const event of eventFiles) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.login(token);
