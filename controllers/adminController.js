const User = require("../models/User");
const Quest = require("../models/Quest");
const BadHabit = require("../models/BadHabit");
const Rule = require("../models/Rule");
const ShopItem = require("../models/ShopItem");
const Party = require("../models/Party");
const Record = require("../models/Record");
const VerificationRequest = require("../models/VerificationRequest");
const SystemRule = require("../models/SystemRule");
const { createNotification } = require("./notificationController");
const { addXP } = require("../utils/xp");
const { createRecord } = require("../utils/record");

exports.dashboard = async (req, res) => {
  try {
    const [users, parties, quests, submissions, pendingVerifs] = await Promise.all([
      User.countDocuments(),
      Party.countDocuments(),
      Quest.countDocuments(),
      VerificationRequest.countDocuments(),
      VerificationRequest.countDocuments({ status: "PENDING" }),
    ]);
    const activeUsers = await User.countDocuments({ isActive: true });
    const activeParties = await Party.countDocuments({ isActive: true });
    const xpAwarded = await Record.aggregate([{ $match: { xpChange: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: "$xpChange" } } }]);
    const xpDeducted = await Record.aggregate([{ $match: { xpChange: { $lt: 0 } } }, { $group: { _id: null, total: { $sum: "$xpChange" } } }]);
    res.json({ success: true, data: { users, activeUsers, parties, activeParties, quests, submissions, pendingVerifs, xpAwarded: xpAwarded[0]?.total || 0, xpDeducted: xpDeducted[0]?.total || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserRecords = async (req, res) => {
  try {
    const records = await Record.find({ userId: req.params.id }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// System Quests
exports.createSystemQuest = async (req, res) => {
  try {
    const { title, description, category, xpReward, cooldownHours } = req.body;
    if (!title || !xpReward) return res.status(400).json({ success: false, message: "Title and XP reward required" });
    const quest = await Quest.create({ title, description, category, xpReward: Number(xpReward), type: "SYSTEM", isSystem: true, cooldownHours: Number(cooldownHours) || 0, createdBy: req.user._id });
    
    // Notify all users
    const allUsers = await User.find({ isActive: true });
    for (const u of allUsers) {
      await createNotification({
        userId: u._id,
        type: "SYSTEM_QUEST_AVAILABLE",
        title: "New System Quest!",
        message: `A new quest is available: ${title}`,
        link: "/quests",
      });
    }

    res.status(201).json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSystemQuests = async (req, res) => {
  try {
    const quests = await Quest.find({ isSystem: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: quests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSystemQuest = async (req, res) => {
  try {
    const quest = await Quest.findOne({ _id: req.params.id, isSystem: true });
    if (!quest) return res.status(404).json({ success: false, message: "System quest not found" });
    Object.assign(quest, req.body);
    await quest.save();
    res.json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSystemQuest = async (req, res) => {
  try {
    const quest = await Quest.findOneAndDelete({ _id: req.params.id, isSystem: true });
    if (!quest) return res.status(404).json({ success: false, message: "System quest not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// System Shop
exports.createSystemShop = async (req, res) => {
  try {
    const { title, description, xpCost, cooldownHours } = req.body;
    if (!title || !xpCost) return res.status(400).json({ success: false, message: "Title and XP cost required" });
    const item = await ShopItem.create({ title, description, xpCost: Number(xpCost), cooldownHours: Number(cooldownHours) || 0, isSystem: true, createdBy: req.user._id });
    
    // Notify all users
    const allUsers = await User.find({ isActive: true });
    for (const u of allUsers) {
      await createNotification({
        userId: u._id,
        type: "SYSTEM_SHOP_AVAILABLE",
        title: "New Shop Item!",
        message: `A new item is available in the shop: ${title}`,
        link: "/shop",
      });
    }

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSystemShop = async (req, res) => {
  try {
    const items = await ShopItem.find({ isSystem: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSystemShop = async (req, res) => {
  try {
    const item = await ShopItem.findOneAndUpdate({ _id: req.params.id, isSystem: true }, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSystemShop = async (req, res) => {
  try {
    const item = await ShopItem.findOneAndDelete({ _id: req.params.id, isSystem: true });
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// System Rules
exports.createSystemRule = async (req, res) => {
  try {
    const { title, description, xpPenalty } = req.body;
    if (!title || !xpPenalty) return res.status(400).json({ success: false, message: "Title and XP penalty required" });
    const rule = await Rule.create({ title, description, xpPenalty: Number(xpPenalty), isSystem: true, createdBy: req.user._id });
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSystemRules = async (req, res) => {
  try {
    const rules = await Rule.find({ isSystem: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSystemRule = async (req, res) => {
  try {
    const rule = await Rule.findOneAndUpdate({ _id: req.params.id, isSystem: true }, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSystemRule = async (req, res) => {
  try {
    const rule = await Rule.findOneAndDelete({ _id: req.params.id, isSystem: true });
    if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin Verifications
exports.getVerifications = async (req, res) => {
  try {
    const verifications = await VerificationRequest.find({ verificationType: "ADMIN" })
      .populate("submittedBy", "username email avatar xp")
      .populate("targetId")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: verifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveVerification = async (req, res) => {
  try {
    const verification = await VerificationRequest.findById(req.params.id);
    if (!verification || verification.status !== "PENDING") {
      return res.status(404).json({ success: false, message: "Verification not found or already processed" });
    }

    verification.status = "APPROVED";
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    verification.reviewNote = req.body.note || "Approved by Admin";
    await verification.save();
    
    const updatedUser = await addXP(verification.submittedBy, verification.xpAmount);
    const newXP = updatedUser?.xp || 0;
    
    await createRecord({
      userId: verification.submittedBy,
      action: "QUEST_APPROVED",
      targetType: verification.targetType?.toUpperCase(),
      targetId: verification.targetId,
      xpChange: verification.xpAmount,
      message: `Quest approved by Admin. +${verification.xpAmount} XP`,
      metadata: { reviewedBy: req.user._id, note: verification.reviewNote }
    });

    await createNotification({
      userId: verification.submittedBy,
      type: "PROOF_APPROVED",
      title: "Quest Approved!",
      message: `Your quest proof was approved by Admin. +${verification.xpAmount} XP`,
      link: "/app/quests"
    });

    res.json({ success: true, message: "Approved", data: { verification, updatedXP: newXP } });
  } catch (err) {
    console.error("Admin approve error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectVerification = async (req, res) => {
  try {
    const verification = await VerificationRequest.findById(req.params.id);
    if (!verification || verification.status !== "PENDING") {
      return res.status(404).json({ success: false, message: "Verification not found or already processed" });
    }

    verification.status = "REJECTED";
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    verification.reviewNote = req.body.note || "Rejected by Admin";
    await verification.save();

    await createRecord({
      userId: verification.submittedBy,
      action: "QUEST_REJECTED",
      targetType: verification.targetType?.toUpperCase(),
      targetId: verification.targetId,
      xpChange: 0,
      message: `Quest rejected by Admin.`,
      metadata: { reviewedBy: req.user._id, note: verification.reviewNote }
    });

    await createNotification({
      userId: verification.submittedBy,
      type: "PROOF_REJECTED",
      title: "Quest Rejected",
      message: `Your quest proof was rejected by Admin. Reason: ${verification.reviewNote}`,
      link: "/app/quests"
    });

    res.json({ success: true, message: "Rejected" });
  } catch (err) {
    console.error("Admin reject error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Automated System Rules
exports.getAutomatedRules = async (req, res) => {
  try {
    let rules = await SystemRule.find();
    // Seed if empty
    if (rules.length === 0) {
      await SystemRule.create({
        type: "DAILY_XP_MINIMUM",
        title: "Daily XP Goal",
        description: "If you gain less than 50 XP in a day, a penalty is applied.",
        minXP: 50,
        penaltyXP: 10,
        isEnabled: true
      });
      rules = await SystemRule.find();
    }
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAutomatedRule = async (req, res) => {
  try {
    const rule = await SystemRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
