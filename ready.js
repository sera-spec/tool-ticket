const { REST, Routes } = require('discord.js');
const { token, clientId } = require('./config');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Cache all guild invites on startup
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        const cache = new Map();
        invites.forEach(inv => cache.set(inv.code, inv.uses));
        client.inviteCache.set(guild.id, cache);
        console.log(`📨 Cached ${invites.size} invite(s) for guild: ${guild.name}`);
      } catch (err) {
        console.warn(`⚠️  Could not cache invites for ${guild.name}:`, err.message);
      }
    }

    // Register slash commands globally
    const commands = [
      require('./add-invites'),
      require('./invites'),
      require('./leaderboard'),
      require('./ticket-claim'),
      require('./ticket-panel'),
    ].filter(c => c.data).map(c => c.data.toJSON());

    const rest = new REST({ version: '10' }).setToken(token);
    try {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`🔧 Registered ${commands.length} slash command(s)`);
    } catch (err) {
      console.error('Failed to register commands:', err);
    }
  },
};
