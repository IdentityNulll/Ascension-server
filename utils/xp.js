const User = require("../models/User");

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

module.exports = { addXP, subtractXP };
