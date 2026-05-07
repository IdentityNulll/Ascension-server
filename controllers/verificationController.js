const VerificationRequest = require("../models/VerificationRequest");
const Party = require("../models/Party");
const { createRecord } = require("../utils/record");
const { addXP, subtractXP } = require("../utils/xp");

const isMember = (party, userId) =>
  party.members.some((m) => m.userId.toString() === userId.toString());

exports.getPending = async (req, res) => {
  try {
    const parties = await Party.find({ "members.userId": req.user._id });
    const partyIds = parties.map((p) => p._id);
    const pending = await VerificationRequest.find({
      partyId: { $in: partyIds },
      status: "PENDING",
      submittedBy: { $ne: req.user._id },
    })
      .populate("submittedBy", "username")
      .populate("targetId")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: pending });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPartyVerifications = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party || !isMember(party, req.user._id))
      return res.status(403).json({ success: false, message: "Not a member" });
    const verifications = await VerificationRequest.find({
      partyId: req.params.id,
    })
      .populate("submittedBy", "username")
      .populate("reviewedBy", "username")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: verifications });
  } catch (err) {
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
    if (verification.partyId) {
      const party = await Party.findById(verification.partyId);
      if (!party || !isMember(party, req.user._id))
        return res
          .status(403)
          .json({ success: false, message: "Not a member" });
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
      targetType: "QUEST",
      targetId: verification.targetId,
      xpChange: verification.xpAmount,
      message: `Proof approved. +${verification.xpAmount} XP`,
      metadata: { reviewedBy: req.user._id },
    });
    res.json({ success: true, data: { verification, newXP: user?.xp } });
  } catch (err) {
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
    verification.status = "REJECTED";
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    verification.reviewNote = req.body.note || "";
    await verification.save();
    await createRecord({
      userId: verification.submittedBy,
      partyId: verification.partyId,
      action: "QUEST_REJECTED",
      targetType: "QUEST",
      targetId: verification.targetId,
      xpChange: 0,
      message: `Proof rejected.`,
      metadata: { reviewedBy: req.user._id },
    });
    res.json({ success: true, data: verification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
