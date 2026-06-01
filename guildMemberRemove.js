const { AuditLogEvent } = require('discord.js');
const { getGuildInvites, saveGuildInvites } = require('./db');

// We don't know who invited someone who left without storing it,
// so this event just re-caches invites and can be extended with a join-log DB.
module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const guild = member.guild;

    // Refresh invite cache so counts stay accurate
    try {
      const invites = await guild.invites.fetch();
      const cache = new Map();
      invites.forEach(inv => cache.set(inv.code, inv.uses));
      client.inviteCache.set(guild.id, cache);
    } catch (err) {
      // Silently ignore if invites can't be fetched
    }
  },
};
