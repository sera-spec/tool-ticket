const { Events, MessageFlags } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    
    // 1. HANDLE BUTTON INTERACTIONS (For your Ticket Panel)
    if (interaction.isButton()) {
      console.log(`🔘 Button clicked: ${interaction.customId} by ${interaction.user.tag}`);
      
      // Look for your button handler file
      const buttonHandler = require('./ticketButtons'); 
      
      if (buttonHandler && buttonHandler.execute) {
        try {
          await buttonHandler.execute(interaction, client);
        } catch (error) {
          console.error(`❌ Error handling button ${interaction.customId}:`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
              content: 'There was an error processing this button action.', 
              flags: [MessageFlags.Ephemeral] 
            });
          }
        }
      }
      return; // Stop here so it doesn't try to process it as a slash command
    }

    // 2. HANDLE SLASH COMMANDS
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`❌ No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`❌ Error executing ${interaction.commandName}:`, error);
      
      const errorResponse = { 
        content: 'There was an error while executing this command!', 
        flags: [MessageFlags.Ephemeral] 
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorResponse);
      } else {
        await interaction.reply(errorResponse);
      }
    }
  },
};
