const User = require("../models/User");
const { addXP } = require("../utils/xp");
const { createRecord } = require("../utils/record");
const { createNotification } = require("./notificationController");

exports.getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const lastClaim = user.lastDailyGiftClaimAt;
    const now = new Date();

    let canClaim = true;
    if (lastClaim) {
      const nextAvailable = new Date(lastClaim);
      nextAvailable.setHours(nextAvailable.getHours() + 24);
      canClaim = now >= nextAvailable;
    }

    res.json({
      success: true,
      data: {
        canClaim,
        lastClaimAt: lastClaim,
        nextClaimAt: lastClaim
          ? new Date(new Date(lastClaim).getTime() + 24 * 60 * 60 * 1000)
          : now,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.claimGift = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const lastClaim = user.lastDailyGiftClaimAt;
    const now = new Date();

    if (lastClaim) {
      const nextAvailable = new Date(lastClaim);
      nextAvailable.setHours(nextAvailable.getHours() + 24);
      if (now < nextAvailable) {
        return res.status(400).json({
          success: false,
          message: "Daily gift not available yet",
        });
      }
    }

    const rewardAmount = Math.floor(Math.random() * (100 - 50 + 1)) + 50; // 50-100 XP
    user.lastDailyGiftClaimAt = now;
    await user.save();

    const updatedUser = await addXP(user._id, rewardAmount);

    await createRecord({
      userId: user._id,
      action: "DAILY_GIFT_CLAIMED",
      xpChange: rewardAmount,
      message: `Claimed daily gift! +${rewardAmount} XP`,
    });

    await createNotification({
      userId: user._id,
      type: "DAILY_GIFT",
      title: "Daily Gift Claimed",
      message: `You received ${rewardAmount} XP from your daily gift!`,
    });

    res.json({
      success: true,
      data: {
        rewardAmount,
        newXP: updatedUser.xp,
        nextClaimAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
