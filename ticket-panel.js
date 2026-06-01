const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { embedColor } = require('./config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Post the ticket panel in this channel (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('🎟️ Support Tickets')
      .setDescription(
        `Need help or want to report something?\n\n` +
        `Click the button below to open a private ticket.\n` +
        `You will be asked to provide **image proof** before a moderator joins.`
      )
      .setFooter({ text: interaction.guild.name })
      .setTimestamp();

    const openBtn = new ButtonBuilder()
      .setCustomId('ticket_open')
      .setLabel('Open a Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎟️');

    const row = new ActionRowBuilder().addComponents(openBtn);

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Ticket panel posted!', ephemeral: true });
  },
};
