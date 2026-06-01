const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildInvites, getRealInvites } = require('./db');
const { embedColor } = require('./config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription("Check a member's invite count")
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('User to check (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildData = getGuildInvites(interaction.guild.id);
    const stats = guildData[target.id] || { invites: 0, left: 0, fake: 0, bonus: 0 };
    const real = getRealInvites(stats);

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`📨 Invite Stats — ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '✅ Total Invites', value: `${stats.invites || 0}`, inline: true },
        { name: '🚪 Left', value: `${stats.left || 0}`, inline: true },
        { name: '🚫 Fake', value: `${stats.fake || 0}`, inline: true },
        { name: '🎁 Bonus', value: `${stats.bonus || 0}`, inline: true },
        { name: '⭐ Real Invites', value: `**${real}**`, inline: true },
      )
      .setFooter({ text: `Real = Invites - Left - Fake + Bonus` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
