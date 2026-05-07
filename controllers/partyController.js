const Party = require("../models/Party");
const User = require("../models/User");
const Quest = require("../models/Quest");
const VerificationRequest = require("../models/VerificationRequest");
const Record = require("../models/Record");
const { createRecord } = require("../utils/record");
const { addXP, subtractXP } = require("../utils/xp");
const upload = require("../utils/multer");

const isMember = (party, userId) =>
  party.members.some((m) => {
    const mId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
    return mId === userId.toString();
  });

exports.getParties = async (req, res) => {
  try {
    const parties = await Party.find({ "members.userId": req.user._id }).populate("members.userId", "username xp");
    res.json({ success: true, data: parties });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createParty = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Party name required" });
    const party = await Party.create({ name, description, ownerId: req.user._id, members: [{ userId: req.user._id, role: "OWNER" }] });
    await createRecord({ userId: req.user._id, partyId: party._id, action: "PARTY_CREATED", targetType: "PARTY", targetId: party._id, message: `Party created: ${name}` });
    res.status(201).json({ success: true, data: party });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id).populate("members.userId", "username xp email");
    if (!party) return res.status(404).json({ success: false, message: "Party not found" });
    if (!isMember(party, req.user._id)) return res.status(403).json({ success: false, message: "Not a member" });
    res.json({ success: true, data: party });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ success: false, message: "Party not found" });
    if (party.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Only owner can update" });
    const { name, description } = req.body;
    if (name) party.name = name;
    if (description !== undefined) party.description = description;
    await party.save();
    res.json({ success: true, data: party });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.inviteMember = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ success: false, message: "Party not found" });
    if (party.ownerId.toString() !== req.user._id.toString() && !isMember(party, req.user._id)) return res.status(403).json({ success: false, message: "Not authorized" });
    const { email, username } = req.body;
    const target = await User.findOne(email ? { email } : { username });
    if (!target) return res.status(404).json({ success: false, message: "User not found" });
    if (isMember(party, target._id)) return res.status(409).json({ success: false, message: "Already a member" });
    party.members.push({ userId: target._id, role: "MEMBER" });
    await party.save();
    await createRecord({ userId: target._id, partyId: party._id, action: "PARTY_JOINED", targetType: "PARTY", targetId: party._id, message: `Joined party: ${party.name}` });
    res.json({ success: true, data: party });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.joinByCode = async (req, res) => {
  try {
    const { code } = req.body;
    const party = await Party.findOne({ inviteCode: code?.toUpperCase() });
    if (!party) return res.status(404).json({ success: false, message: "Invalid invite code" });
    if (isMember(party, req.user._id)) return res.status(409).json({ success: false, message: "Already a member" });
    party.members.push({ userId: req.user._id, role: "MEMBER" });
    await party.save();
    await createRecord({ userId: req.user._id, partyId: party._id, action: "PARTY_JOINED", targetType: "PARTY", targetId: party._id, message: `Joined party: ${party.name}` });
    res.json({ success: true, data: party });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.leaveParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ success: false, message: "Party not found" });
    if (party.ownerId.toString() === req.user._id.toString()) return res.status(400).json({ success: false, message: "Owner cannot leave; transfer ownership or delete party" });
    party.members = party.members.filter((m) => m.userId.toString() !== req.user._id.toString());
    await party.save();
    await createRecord({ userId: req.user._id, partyId: party._id, action: "PARTY_LEFT", targetType: "PARTY", targetId: party._id, message: `Left party: ${party.name}` });
    res.json({ success: true, message: "Left party" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ success: false, message: "Party not found" });
    if (party.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Only owner can remove members" });
    if (req.params.userId === req.user._id.toString()) return res.status(400).json({ success: false, message: "Cannot remove yourself" });
    party.members = party.members.filter((m) => m.userId.toString() !== req.params.userId);
    await party.save();
    await createRecord({ userId: req.params.userId, partyId: party._id, action: "PARTY_MEMBER_REMOVED", targetType: "PARTY", targetId: party._id, message: `Removed from party: ${party.name}` });
    res.json({ success: true, data: party });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id).populate("members.userId", "username xp");
    if (!party) return res.status(404).json({ success: false, message: "Party not found" });
    if (!isMember(party, req.user._id)) return res.status(403).json({ success: false, message: "Not a member" });
    const memberIds = party.members.map((m) => m.userId._id);
    const xpData = await Record.aggregate([
      { $match: { partyId: party._id, action: "QUEST_APPROVED", xpChange: { $gt: 0 }, userId: { $in: memberIds } } },
      { $group: { _id: "$userId", totalXP: { $sum: "$xpChange" } } },
    ]);
    const board = party.members.map((m) => {
      const entry = xpData.find((e) => e._id.toString() === m.userId._id.toString());
      return { user: m.userId, partyXP: entry?.totalXP || 0 };
    }).sort((a, b) => b.partyXP - a.partyXP);
    res.json({ success: true, data: board });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPartyQuests = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party || !isMember(party, req.user._id)) return res.status(403).json({ success: false, message: "Not a member" });
    const quests = await Quest.find({ partyId: req.params.id, type: "PARTY" }).populate("createdBy", "username");
    res.json({ success: true, data: quests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPartyQuest = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party || !isMember(party, req.user._id)) return res.status(403).json({ success: false, message: "Not a member" });
    const { title, description, category, xpReward } = req.body;
    if (!title || !xpReward) return res.status(400).json({ success: false, message: "Title and XP reward required" });
    const quest = await Quest.create({ title, description, category, xpReward: Number(xpReward), type: "PARTY", partyId: party._id, createdBy: req.user._id });
    await createRecord({ userId: req.user._id, partyId: party._id, action: "QUEST_CREATED", targetType: "QUEST", targetId: quest._id, message: `Party quest created: ${title}` });
    res.status(201).json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitPartyProof = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.questId);
    if (!quest || quest.type !== "PARTY") return res.status(404).json({ success: false, message: "Party quest not found" });
    const party = await Party.findById(quest.partyId);
    if (!party || !isMember(party, req.user._id)) return res.status(403).json({ success: false, message: "Not a member" });
    const proofFile = req.file ? req.file.filename : null;
    const proofNote = req.body.note || "";
    const verification = await VerificationRequest.create({ submittedBy: req.user._id, partyId: quest.partyId, targetType: "QUEST", targetId: quest._id, proofFile, proofNote, xpAmount: quest.xpReward, mode: "PARTY" });
    await createRecord({ userId: req.user._id, partyId: quest.partyId, action: "PROOF_SUBMITTED", targetType: "QUEST", targetId: quest._id, message: `Party proof submitted for: ${quest.title}` });
    res.status(201).json({ success: true, data: verification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
