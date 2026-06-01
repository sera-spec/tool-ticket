const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { embedColor } = require('./config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Spawns the multi-option ticket creation panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // 1. Create the Main Embed Panel
    const panelEmbed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('🎟️ Create a Support Ticket')
      .setDescription(
        'Click the button below matching the type of assistance you need to open a private ticket:\n\n' +
        '📩 **Invites Rewards:** Claiming or verifying your invite-related rewards.\n' +
        '📦 **Chest Rewards:** Claiming or reporting issues with chest items.\n' +
        '🎉 **Giveaway Rewards:** Claiming prizes won from server giveaways.\n' +
        '⚙️ **General Support:** All other questions, player reports, or general assistance.'
      )
      .setFooter({ text: 'Please choose the correct category to receive help faster!' })
      .setTimestamp();

    // 2. Build the Four Styled Buttons
    const invitesBtn = new ButtonBuilder()
      .setCustomId('ticket_invites')
      .setLabel('Invites Rewards')
      .setStyle(ButtonStyle.Success)
      .setEmoji('📩');

    const chestBtn = new ButtonBuilder()
      .setCustomId('ticket_chest')
      .setLabel('Chest Rewards')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📦');

    const giveawayBtn = new ButtonBuilder()
      .setCustomId('ticket_giveaway')
      .setLabel('Giveaway Rewards')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🎉');

    const generalBtn = new ButtonBuilder()
      .setCustomId('ticket_general')
      .setLabel('General Support')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚙️');

    // 3. Put them into action rows
    const row = new ActionRowBuilder().addComponents(invitesBtn, chestBtn, giveawayBtn, generalBtn);

    // 4. Send the interface panel to the channel
    await interaction.reply({
      content: '✅ Ticket panel spawned successfully!',
      ephemeral: true
    });

    await interaction.channel.send({
      embeds: [panelEmbed],
      components: [row]
    });
  },
};
