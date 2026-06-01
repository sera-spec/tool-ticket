const { EmbedBuilder } = require('discord.js');
const { addInvite } = require('./db');
const { embedColor } = require('./config');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const guild = member.guild;

    try {
      // Fetch current invites
      const newInvites = await guild.invites.fetch();
      const oldCache = client.inviteCache.get(guild.id) || new Map();

      // Find which invite was used (uses increased by 1)
      let usedInvite = null;
      for (const [code, invite] of newInvites) {
        const oldUses = oldCache.get(code) || 0;
        if (invite.uses > oldUses) {
          usedInvite = invite;
          break;
        }
      }

      // Update cache
      const newCache = new Map();
      newInvites.forEach(inv => newCache.set(inv.code, inv.uses));
      client.inviteCache.set(guild.id, newCache);

      if (!usedInvite || !usedInvite.inviter) {
        console.log(`[Invite] ${member.user.tag} joined via unknown/vanity invite`);
        return;
      }

      const inviter = usedInvite.inviter;
      addInvite(guild.id, inviter.id, 'invites');
      console.log(`[Invite] ${member.user.tag} was invited by ${inviter.tag} (code: ${usedInvite.code})`);

      // Log to invite-logs channel if it exists
      const logChannel = guild.channels.cache.find(c => c.name === 'invite-logs');
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle('📨 New Member Joined')
          .setThumbnail(member.user.displayAvatarURL())
          .addFields(
            { name: 'Member', value: `${member} (${member.user.tag})`, inline: true },
            { name: 'Invited By', value: `<@${inviter.id}> (${inviter.tag})`, inline: true },
            { name: 'Invite Code', value: `\`${usedInvite.code}\``, inline: true },
          )
          .setTimestamp();
        logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('[guildMemberAdd] Error tracking invite:', err.message);
    }
  },
};
