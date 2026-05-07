const Record = require("../models/Record");

const createRecord = async ({ userId, partyId, action, targetType, targetId, xpChange, message, metadata }) => {
  return Record.create({ userId, partyId: partyId || null, action, targetType, targetId: targetId || null, xpChange: xpChange || 0, message: message || "", metadata: metadata || {} });
};

module.exports = { createRecord };
