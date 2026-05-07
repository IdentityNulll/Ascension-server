const mongoose = require("mongoose");

const questSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    category: { type: String, trim: true, default: "General" },
    xpReward: { type: Number, required: true, min: 1, max: 10000 },
    type: { type: String, enum: ["SOLO", "PARTY", "SYSTEM"], required: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, ref: "Party", default: null },
    isSystem: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    cooldownHours: { type: Number, default: 0 },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quest", questSchema);
