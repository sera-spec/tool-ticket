const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate, // Properly hooks into the discord.js v15 event system
  async execute(interaction, client) {
    // Only handle Slash Commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`❌ No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      // Execute the slash command code
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`❌ Error executing ${interaction.commandName}:`, error);
      
      // Prevent crashing and notify the user if something goes wrong internally
      const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};
