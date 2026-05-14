const Quest = require("../models/Quest");
const VerificationRequest = require("../models/VerificationRequest");
const { createRecord } = require("../utils/record");
const { addXP } = require("../utils/xp");
const upload = require("../utils/multer");

exports.getQuests = async (req, res) => {
  try {
    const filter = {
      $or: [
        { createdBy: req.user._id, type: "SOLO" },
        { isSystem: true, type: "SYSTEM" },
      ],
    };
    const quests = await Quest.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: quests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createQuest = async (req, res) => {
  try {
    const { title, description, category, xpReward, cooldownHours } = req.body;
    if (!title || !xpReward) return res.status(400).json({ success: false, message: "Title and XP reward required" });
    const quest = await Quest.create({ title, description, category, xpReward: Number(xpReward), type: "SOLO", createdBy: req.user._id, cooldownHours: Number(cooldownHours) || 0 });
    await createRecord({ userId: req.user._id, action: "QUEST_CREATED", targetType: "QUEST", targetId: quest._id, message: `Quest created: ${title}` });
    res.status(201).json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateQuest = async (req, res) => {
  try {
    const quest = await Quest.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!quest) return res.status(404).json({ success: false, message: "Quest not found" });
    const { title, description, category, xpReward, cooldownHours } = req.body;
    Object.assign(quest, { title: title || quest.title, description: description ?? quest.description, category: category || quest.category, xpReward: xpReward ? Number(xpReward) : quest.xpReward, cooldownHours: cooldownHours !== undefined ? Number(cooldownHours) : quest.cooldownHours });
    await quest.save();
    res.json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteQuest = async (req, res) => {
  try {
    const quest = await Quest.findOne({ _id: req.params.id, createdBy: req.user._id, isSystem: false });
    if (!quest) return res.status(404).json({ success: false, message: "Quest not found or cannot be deleted" });
    await quest.deleteOne();
    res.json({ success: true, message: "Quest deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitProof = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest) return res.status(404).json({ success: false, message: "Quest not found" });
    const proofFile = req.file ? req.file.filename : null;
    const proofNote = req.body.note || "";
    const verification = await VerificationRequest.create({
      submittedBy: req.user._id,
      targetType: "Quest",
      targetId: quest._id,
      proofFile,
      proofNote,
      xpAmount: quest.xpReward,
      mode: "SOLO",
      verificationType: "ADMIN",
    });
    await createRecord({ userId: req.user._id, action: "PROOF_SUBMITTED", targetType: "QUEST", targetId: quest._id, message: `Proof submitted for: ${quest.title}` });
    res.status(201).json({ success: true, data: verification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.soloApprove = async (req, res) => {
  return res.status(403).json({ success: false, message: "AI verification is currently disabled. Please wait for admin review." });
};
