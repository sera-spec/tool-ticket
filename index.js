const { Client, GatewayIntentBits, Collection, Partials, ActivityType } = require('discord.js');
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
  // FORCES BOT STATUS TO BE VISIBLY ONLINE INSTEAD OF INVISIBLE
  presence: {
    status: 'online',
    activities: [{
      name: 'Tickets',
      type: ActivityType.Watching
    }]
  }
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
  // Safe check for the event name string mapping
  const eventName = typeof event.name === 'string' ? event.name : String(event.name);
  
  if (event.once) {
    client.once(eventName, (...args) => event.execute(...args, client));
  } else {
    client.on(eventName, (...args) => event.execute(...args, client));
  }
}

client.login(token);
