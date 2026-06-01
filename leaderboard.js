const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('./db');
const { embedColor } = require('./config');

const medals = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the invite leaderboard')
    .addIntegerOption(opt =>
      opt.setName('top')
        .setDescription('How many entries to show (default 10, max 20)')
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    ),

  async execute(interaction) {
    const limit = interaction.options.getInteger('top') || 10;
    const board = getLeaderboard(interaction.guild.id, limit);

    if (board.length === 0) {
      return interaction.reply({ content: '📭 No invite data yet!', ephemeral: true });
    }

    const rows = board.map((entry, i) => {
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} <@${entry.userId}> — **${entry.real}** invites *(${entry.invites} total · ${entry.left} left · ${entry.fake} fake)*`;
    });

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🏆 Invite Leaderboard — ${interaction.guild.name}`)
      .setDescription(rows.join('\n'))
      .setFooter({ text: `Top ${board.length} inviters` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
