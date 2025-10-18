const VisitorTicket = require("../models/visitor-ticket.model");

const getActiveVisitorTicketForUser = async (userId) => {
  if (!userId) return null;

  return VisitorTicket.findOne({
    user: userId,
    expiresAt: { $gt: new Date() },
  })
    .sort({ expiresAt: -1 })
    .lean();
};

const serializeVisitorTicket = (ticketDoc) => {
  if (!ticketDoc) return null;

  const expiresAt = ticketDoc.expiresAt instanceof Date
    ? ticketDoc.expiresAt
    : new Date(ticketDoc.expiresAt);

  if (!Number.isFinite(expiresAt.getTime())) {
    return {
      token: ticketDoc.token,
      expiresAt: ticketDoc.expiresAt,
      remainingMinutes: 0,
      formattedRemaining: '0h 0m',
      isExpired: true,
      status: 'expired',
    };
  }

  const now = Date.now();
  const diffMs = expiresAt.getTime() - now;
  const isExpired = diffMs <= 0;
  const remainingMs = Math.max(diffMs, 0);
  const remainingMinutes = Math.floor(remainingMs / 60000);
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMinutesMod = remainingMinutes % 60;

  return {
    token: ticketDoc.token,
    expiresAt,
    remainingMinutes,
    formattedRemaining: `${remainingHours}h ${remainingMinutesMod}m`,
    isExpired,
    status: isExpired ? 'expired' : 'active',
  };
};

module.exports = {
  getActiveVisitorTicketForUser,
  serializeVisitorTicket,
};
