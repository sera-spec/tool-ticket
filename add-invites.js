const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildInvites, saveGuildInvites, getRealInvites } = require('./db');
const { embedColor } = require('./config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-invites')
    .setDescription('Manually add bonus invites to a user (Mod only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt.setName('user').setDescription('Target user').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Number of bonus invites to add').setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildData = getGuildInvites(interaction.guild.id);

    if (!guildData[target.id]) {
      guildData[target.id] = { invites: 0, left: 0, fake: 0, bonus: 0 };
    }
    guildData[target.id].bonus = (guildData[target.id].bonus || 0) + amount;
    saveGuildInvites(interaction.guild.id, guildData);

    const real = getRealInvites(guildData[target.id]);
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setDescription(`✅ Added **${amount}** bonus invite(s) to ${target}. They now have **${real}** real invite(s).`);

    await interaction.reply({ embeds: [embed] });
  },
};
