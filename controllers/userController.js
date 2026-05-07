const User = require("../models/User");
const Record = require("../models/Record");
const Quest = require("../models/Quest");
const VerificationRequest = require("../models/VerificationRequest");

exports.dashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const recentRecords = await Record.find({ userId }).sort({ createdAt: -1 }).limit(10);
    const pendingVerifications = await VerificationRequest.find({ submittedBy: userId, status: "PENDING" }).populate("targetId");
    const totalXPGained = await Record.aggregate([
      { $match: { userId, xpChange: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$xpChange" } } },
    ]);
    const totalXPLost = await Record.aggregate([
      { $match: { userId, xpChange: { $lt: 0 } } },
      { $group: { _id: null, total: { $sum: "$xpChange" } } },
    ]);
    res.json({
      success: true,
      data: {
        user: req.user,
        recentRecords,
        pendingVerifications: pendingVerifications.length,
        totalXPGained: totalXPGained[0]?.total || 0,
        totalXPLost: totalXPLost[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.profile = async (req, res) => {
  res.json({ success: true, data: req.user });
};

exports.updateProfile = async (req, res) => {
  try {
    const { username } = req.body;
    if (username) {
      const taken = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (taken) return res.status(409).json({ success: false, message: "Username already taken" });
    }
    const updated = await User.findByIdAndUpdate(req.user._id, { username }, { new: true, runValidators: true }).select("-password");
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
