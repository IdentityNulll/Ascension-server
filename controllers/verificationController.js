const mongoose = require("mongoose");
const VerificationRequest = require("../models/VerificationRequest");
const Party = require("../models/Party");
const Quest = require("../models/Quest");
const BadHabit = require("../models/BadHabit");
const { createRecord } = require("../utils/record");
const { addXP, subtractXP, addPartyXP } = require("../utils/xp");
const { createNotification } = require("./notificationController");

const isMember = (party, userId) =>
  party.members.some((m) => {
    const mId = m.userId?._id ? m.userId._id.toString() : (m.userId?.toString() || "");
    return mId === userId.toString();
  });

exports.getPending = async (req, res) => {
  try {
    const parties = await Party.find({ "members.userId": req.user._id });
    const partyIds = parties.map((p) => p._id);
    
    // Party verifications
    const partyVerifs = await VerificationRequest.find({
      mode: "PARTY",
      partyId: { $in: partyIds },
      status: "PENDING",
      submittedBy: { $ne: req.user._id },
    })
      .populate("submittedBy", "username email avatar xp")
      .populate("targetId")
      .populate("partyId", "name")
      .sort({ createdAt: -1 });

    // Solo verifications (only if admin)
    let soloVerifs = [];
    if (req.user.role === "ADMIN") {
      soloVerifs = await VerificationRequest.find({
        mode: "SOLO",
        verificationType: "ADMIN",
        status: "PENDING"
      })
      .populate("submittedBy", "username email avatar xp")
      .populate("targetId")
      .sort({ createdAt: -1 });
    }

    res.json({ 
      success: true, 
      data: {
        solo: soloVerifs,
        party: partyVerifs
      }
    });
  } catch (err) {
    console.error("getPending error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPartyVerifications = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Party ID" });
    }
    const party = await Party.findById(req.params.id);
    if (!party || !isMember(party, req.user._id))
      return res.status(403).json({ success: false, message: "Not a member" });
    const verifications = await VerificationRequest.find({
      partyId: req.params.id,
    })
      .populate("submittedBy", "username email avatar")
      .populate("reviewedBy", "username")
      .populate("targetId")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: verifications });
  } catch (err) {
    console.error("getPartyVerifications error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const verification = await VerificationRequest.findById(req.params.id);
    if (!verification)
      return res
        .status(404)
        .json({ success: false, message: "Verification not found" });
    if (verification.status !== "PENDING")
      return res
        .status(400)
        .json({ success: false, message: "Already reviewed" });
    if (verification.submittedBy.toString() === req.user._id.toString())
      return res
        .status(403)
        .json({
          success: false,
          message: "Cannot approve your own submission",
        });
    if (verification.verificationType === "ADMIN" && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Only admins can approve this" });
    }

    if (verification.partyId) {
      const party = await Party.findById(verification.partyId);
      if (!party || !isMember(party, req.user._id))
        return res
          .status(403)
          .json({ success: false, message: "Not a member of this party" });
    }
    verification.status = "APPROVED";
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    verification.reviewNote = req.body?.note || "";
    await verification.save();
    const user = await addXP(verification.submittedBy, verification.xpAmount);
    await createRecord({
      userId: verification.submittedBy,
      partyId: verification.partyId,
      action: "QUEST_APPROVED",
      targetType: verification.targetType?.toUpperCase(),
      targetId: verification.targetId,
      xpChange: verification.xpAmount,
      message: `Proof approved. +${verification.xpAmount} XP`,
      metadata: { reviewedBy: req.user._id },
    });

    if (verification.partyId) {
      await addPartyXP(verification.partyId, verification.submittedBy, verification.xpAmount);
    }

    await createNotification({
      userId: verification.submittedBy,
      type: "PROOF_APPROVED",
      title: "Proof Approved!",
      message: `Your proof for ${verification.targetType} was approved by ${req.user.username}. +${verification.xpAmount} XP`,
      link: `/app/quests`,
    });

    res.json({ success: true, data: { verification, updatedXP: user?.xp } });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const verification = await VerificationRequest.findById(req.params.id);
    if (!verification)
      return res
        .status(404)
        .json({ success: false, message: "Verification not found" });
    if (verification.status !== "PENDING")
      return res
        .status(400)
        .json({ success: false, message: "Already reviewed" });
    if (verification.submittedBy.toString() === req.user._id.toString())
      return res
        .status(403)
        .json({ success: false, message: "Cannot reject your own submission" });

    if (verification.verificationType === "ADMIN" && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Only admins can reject this" });
    }

    if (verification.partyId) {
      const party = await Party.findById(verification.partyId);
      if (!party || !isMember(party, req.user._id))
        return res
          .status(403)
          .json({ success: false, message: "Only party members can reject" });
    }

    verification.status = "REJECTED";
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    verification.reviewNote = req.body?.note || "";
    await verification.save();

    await createRecord({
      userId: verification.submittedBy,
      partyId: verification.partyId,
      action: "QUEST_REJECTED",
      targetType: verification.targetType?.toUpperCase(),
      targetId: verification.targetId,
      xpChange: 0,
      message: `Proof rejected.`,
      metadata: { reviewedBy: req.user._id, reviewNote: verification.reviewNote },
    });

    await createNotification({
      userId: verification.submittedBy,
      type: "PROOF_REJECTED",
      title: "Proof Rejected",
      message: `Your proof for ${verification.targetType} was rejected by ${req.user.username}. Reason: ${verification.reviewNote || "No reason provided"}`,
      link: `/app/verifications`,
    });

    res.json({ success: true, data: { verification } });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
