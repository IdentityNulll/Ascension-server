const User = require("../models/User");
const Party = require("../models/Party");

const addXP = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) return null;
  user.xp = Math.max(0, user.xp + amount);
  await user.save();
  return user;
};

const subtractXP = async (userId, amount) => {
  return addXP(userId, -Math.abs(amount));
};

const addPartyXP = async (partyId, userId, amount) => {
  try {
    const party = await Party.findById(partyId);
    if (!party) return null;
    const member = party.members.find((m) => m.userId.toString() === userId.toString());
    if (member) {
      member.xpEarned += amount;
      await party.save();
    }
    return party;
  } catch (err) {
    console.error("Error adding party XP:", err);
    return null;
  }
};

module.exports = { addXP, subtractXP, addPartyXP };
