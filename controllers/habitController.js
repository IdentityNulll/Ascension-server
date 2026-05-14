const BadHabit = require("../models/BadHabit");
const VerificationRequest = require("../models/VerificationRequest");
const Party = require("../models/Party");
const { createRecord } = require("../utils/record");
const { subtractXP } = require("../utils/xp");

const isMember = (party, userId) => party.members.some((m) => m.userId.toString() === userId.toString());

exports.getHabits = async (req, res) => {
  try {
    const habits = await BadHabit.find({
      $or: [{ createdBy: req.user._id }, { isSystem: true }],
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: habits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createHabit = async (req, res) => {
  try {
    const { title, description, xpPenalty, type, partyId } = req.body;
    if (!title || !xpPenalty) return res.status(400).json({ success: false, message: "Title and XP penalty required" });
    if (type === "PARTY" && partyId) {
      const party = await Party.findById(partyId);
      if (!party || !isMember(party, req.user._id)) return res.status(403).json({ success: false, message: "Not a party member" });
    }
    const habit = await BadHabit.create({ title, description, xpPenalty: Number(xpPenalty), type: type || "SOLO", partyId: partyId || null, createdBy: req.user._id });
    res.status(201).json({ success: true, data: habit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateHabit = async (req, res) => {
  try {
    const habit = await BadHabit.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: "Habit not found" });
    const { title, description, xpPenalty } = req.body;
    if (title) habit.title = title;
    if (description !== undefined) habit.description = description;
    if (xpPenalty) habit.xpPenalty = Number(xpPenalty);
    await habit.save();
    res.json({ success: true, data: habit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteHabit = async (req, res) => {
  try {
    const habit = await BadHabit.findOne({ _id: req.params.id, createdBy: req.user._id, isSystem: false });
    if (!habit) return res.status(404).json({ success: false, message: "Habit not found or cannot be deleted" });
    await habit.deleteOne();
    res.json({ success: true, message: "Habit deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.applyHabit = async (req, res) => {
  try {
    const habit = await BadHabit.findById(req.params.id);
    if (!habit) return res.status(404).json({ success: false, message: "Habit not found" });

    if (habit.type === "PARTY" && habit.partyId) {
      const party = await Party.findById(habit.partyId);
      if (!party || !isMember(party, req.user._id)) return res.status(403).json({ success: false, message: "Not a party member" });
      const verification = await VerificationRequest.create({
        submittedBy: req.user._id, partyId: habit.partyId, targetType: "BadHabit",
        targetId: habit._id, xpAmount: habit.xpPenalty, mode: "PARTY",
        proofNote: req.body.note || ""
      });
      await createRecord({ userId: req.user._id, partyId: habit.partyId, action: "BAD_HABIT_APPLIED", targetType: "BAD_HABIT", targetId: habit._id, message: `Party bad habit applied: ${habit.title}. Pending verification.` });
      return res.json({ success: true, data: { verification, message: "Pending verification from party member" } });
    }

    const user = await subtractXP(req.user._id, habit.xpPenalty);
    await createRecord({ userId: req.user._id, action: "BAD_HABIT_APPLIED", targetType: "BAD_HABIT", targetId: habit._id, xpChange: -habit.xpPenalty, message: `Bad habit applied: ${habit.title}. -${habit.xpPenalty} XP` });
    res.json({ success: true, data: { xp: user.xp, xpChange: -habit.xpPenalty } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
