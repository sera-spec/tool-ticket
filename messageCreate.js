const { EmbedBuilder } = require('discord.js');
const { getTicket, updateTicket } = require('./db');
const { modRoleName } = require('./config');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const ticket = getTicket(message.guild.id, message.channel.id);
    if (!ticket) return; // Not a ticket channel

    // Only watch for proof images if ticket is in "open" (awaiting proof) state
    if (ticket.status !== 'open') return;

    // Check if message has image attachments
    const images = message.attachments.filter(att =>
      att.contentType && att.contentType.startsWith('image/')
    );

    if (images.size === 0) {
      // 1. Delete the user's invalid text message right away
      await message.delete().catch(() => {});

      // 2. Send the warning embed to the channel
      const warningMessage = await message.channel.send({
        content: `<@${message.author.id}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('⚠️ Please attach an **image** as proof to proceed. Text-only messages are not accepted in this step.'),
        ],
      }).catch(() => {});

      // 3. Automatically delete the bot's warning message after 5 seconds
      if (warningMessage) {
        setTimeout(async () => {
          await warningMessage.delete().catch(() => {});
        }, 5000); // 5000 milliseconds = 5 seconds
      }
      return;
    }

    // Save image URLs
    const proofUrls = images.map(img => img.url);
    updateTicket(message.guild.id, message.channel.id, {
      status: 'proof_submitted',
      proofImages: proofUrls,
    });

    // Lock channel for ticket opener — only mods can now type
    const modRole = message.guild.roles.cache.find(r => r.name === modRoleName);
    const ticketOpener = await message.guild.members.fetch(ticket.userId).catch(() => null);

    if (ticketOpener) {
      await message.channel.permissionOverwrites.edit(ticketOpener.id, {
        SendMessages: false,
      }).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('✅ Proof Received — Channel Locked')
      .setDescription(
        `Thank you! Your proof has been received and the channel is now **locked** pending mod review.\n\n` +
        `A ${modRole ? `<@&${modRole.id}>` : 'moderator'} will be with you shortly.`
      )
      .addFields({ name: 'Images submitted', value: `${proofUrls.length}` })
      .setTimestamp();

    // Show image thumbnails in embed (first one)
    if (proofUrls[0]) embed.setImage(proofUrls[0]);

    await message.channel.send({ embeds: [embed] });

    // Ping mods
    if (modRole) {
      await message.channel.send(`🔔 ${modRole} — A ticket requires your attention.`);
    }
  },
};
