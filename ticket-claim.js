const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { getTicket, updateTicket } = require('./db');
const { embedColor, modRoleName } = require('./config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-claim')
    .setDescription('Claim this ticket as a moderator'),

  async execute(interaction) {
    const modRole = interaction.guild.roles.cache.find(r => r.name === modRoleName);
    const isMod = modRole && interaction.member.roles.cache.has(modRole.id);
    if (!isMod) {
      return interaction.reply({ content: '❌ Only moderators can claim tickets.', ephemeral: true });
    }

    const ticket = getTicket(interaction.guild.id, interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: '❌ This channel is not a ticket.', ephemeral: true });
    }
    if (ticket.claimedBy) {
      return interaction.reply({ content: `❌ Already claimed by <@${ticket.claimedBy}>.`, ephemeral: true });
    }

    updateTicket(interaction.guild.id, interaction.channel.id, {
      status: 'claimed',
      claimedBy: interaction.member.id,
    });

    // Re-allow the ticket opener to send messages now that a mod has joined
    const ticketOwner = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
    if (ticketOwner) {
      await interaction.channel.permissionOverwrites.edit(ticketOwner.id, {
        SendMessages: true,
      }).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setDescription(`✅ ${interaction.member} has **claimed** this ticket and will assist you shortly.`);

    const closeBtn = new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const row = new ActionRowBuilder().addComponents(closeBtn);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
