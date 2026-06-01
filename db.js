// In-memory database
// NOTE: Data resets on bot restart. For persistence, swap this with
// a real DB like Railway's built-in Postgres or MongoDB Atlas.

const inviteData = {}; // { [guildId]: { [userId]: { invites, left, fake, bonus } } }
const ticketData = {}; // { [guildId]: { counter, tickets: { [channelId]: {...} } } }

// ─── INVITE TRACKING ────────────────────────────────────────────────────────

function getGuildInvites(guildId) {
  return inviteData[guildId] || {};
}

function saveGuildInvites(guildId, data) {
  inviteData[guildId] = data;
}

function addInvite(guildId, inviterId, type = 'invites') {
  if (!inviteData[guildId]) inviteData[guildId] = {};
  if (!inviteData[guildId][inviterId]) {
    inviteData[guildId][inviterId] = { invites: 0, left: 0, fake: 0, bonus: 0 };
  }
  inviteData[guildId][inviterId][type] = (inviteData[guildId][inviterId][type] || 0) + 1;
}

function getRealInvites(stats) {
  if (!stats) return 0;
  return Math.max(0, (stats.invites || 0) - (stats.left || 0) - (stats.fake || 0) + (stats.bonus || 0));
}

function getLeaderboard(guildId, limit = 10) {
  const guildData = getGuildInvites(guildId);
  return Object.entries(guildData)
    .map(([userId, stats]) => ({ userId, ...stats, real: getRealInvites(stats) }))
    .sort((a, b) => b.real - a.real)
    .slice(0, limit);
}

// ─── TICKET TRACKING ────────────────────────────────────────────────────────

function getTickets(guildId) {
  return ticketData[guildId] || { counter: 0, tickets: {} };
}

function saveTickets(guildId, data) {
  ticketData[guildId] = data;
}

function createTicket(guildId, channelId, userId, reason) {
  if (!ticketData[guildId]) ticketData[guildId] = { counter: 0, tickets: {} };
  ticketData[guildId].counter = (ticketData[guildId].counter || 0) + 1;
  ticketData[guildId].tickets[channelId] = {
    id: ticketData[guildId].counter,
    userId,
    reason,
    status: 'open',
    claimedBy: null,
    proofImages: [],
    createdAt: Date.now(),
    closedAt: null,
  };
  return ticketData[guildId].tickets[channelId];
}

function getTicket(guildId, channelId) {
  return ticketData[guildId]?.tickets[channelId] || null;
}

function updateTicket(guildId, channelId, updates) {
  if (!ticketData[guildId]?.tickets[channelId]) return null;
  ticketData[guildId].tickets[channelId] = {
    ...ticketData[guildId].tickets[channelId],
    ...updates,
  };
  return ticketData[guildId].tickets[channelId];
}

module.exports = {
  addInvite,
  getGuildInvites,
  saveGuildInvites,
  getRealInvites,
  getLeaderboard,
  createTicket,
  getTicket,
  updateTicket,
  getTickets,
};
