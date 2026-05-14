const mongoose = require("mongoose");

const verificationRequestSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, ref: "Party", default: null },
    targetType: { 
      type: String, 
      enum: ["Quest", "BadHabit"], 
      required: true,
      set: (v) => {
        if (v === "QUEST") return "Quest";
        if (v === "BAD_HABIT") return "BadHabit";
        return v;
      }
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "targetType" },
    proofFile: { type: String, default: null },
    proofNote: { type: String, default: "" },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "" },
    xpAmount: { type: Number, default: 0 },
    mode: { type: String, enum: ["SOLO", "PARTY"], required: true },
    verificationType: { type: String, enum: ["ADMIN", "PARTY_MEMBER"], default: "PARTY_MEMBER" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VerificationRequest", verificationRequestSchema);
