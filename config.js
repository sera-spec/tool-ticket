module.exports = {
  // 🔑 Your bot token from https://discord.com/developers/applications
  token: process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE',

  // 🆔 Your bot's Client ID (for slash command registration)
  clientId: process.env.CLIENT_ID || 'YOUR_CLIENT_ID_HERE',

  // 🛡️ Role name or ID that can manage tickets (mods/staff)
  modRoleName: 'Moderator',

  // 📂 Category name where ticket channels will be created
  ticketCategoryName: 'Tickets',

  // 📋 Channel where ticket transcripts/logs are sent
  ticketLogChannelName: 'ticket-logs',

  // 🎟️ Channel where users can open a ticket (the panel channel)
  ticketPanelChannelName: 'open-a-ticket',

  // 🏆 Invite leaderboard channel name
  leaderboardChannelName: 'invite-leaderboard',

  // 🎨 Embed color (hex)
  embedColor: 0x5865F2,
};
