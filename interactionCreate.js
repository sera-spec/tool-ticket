module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[Command Error] /${interaction.commandName}:`, err);
        const msg = { content: '❌ An error occurred while running this command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
    }

    // Button interactions
    if (interaction.isButton()) {
      const ticketButtons = require('./ticketButtons');
      await ticketButtons(interaction, client);
    }
  },
};
