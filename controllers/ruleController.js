const Rule = require("../models/Rule");
const { createRecord } = require("../utils/record");
const { subtractXP } = require("../utils/xp");

exports.getRules = async (req, res) => {
  try {
    const rules = await Rule.find({ $or: [{ createdBy: req.user._id }, { isSystem: true }] }).sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRule = async (req, res) => {
  try {
    const { title, description, xpPenalty } = req.body;
    if (!title || !xpPenalty) return res.status(400).json({ success: false, message: "Title and XP penalty required" });
    const rule = await Rule.create({ title, description, xpPenalty: Number(xpPenalty), createdBy: req.user._id });
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateRule = async (req, res) => {
  try {
    const rule = await Rule.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });
    const { title, description, xpPenalty } = req.body;
    if (title) rule.title = title;
    if (description !== undefined) rule.description = description;
    if (xpPenalty) rule.xpPenalty = Number(xpPenalty);
    await rule.save();
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findOne({ _id: req.params.id, createdBy: req.user._id, isSystem: false });
    if (!rule) return res.status(404).json({ success: false, message: "Rule not found or cannot be deleted" });
    await rule.deleteOne();
    res.json({ success: true, message: "Rule deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.breakRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });
    const allowed = rule.isSystem || rule.createdBy?.toString() === req.user._id.toString();
    if (!allowed) return res.status(403).json({ success: false, message: "Not authorized" });
    const user = await subtractXP(req.user._id, rule.xpPenalty);
    await createRecord({ userId: req.user._id, action: "RULE_BROKEN", targetType: "RULE", targetId: rule._id, xpChange: -rule.xpPenalty, message: `Rule broken: ${rule.title}. -${rule.xpPenalty} XP` });
    res.json({ success: true, data: { xp: user.xp, xpChange: -rule.xpPenalty } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
