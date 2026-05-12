const mongoose = require("mongoose");

const systemRuleSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["DAILY_XP_MINIMUM"], required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    minXP: { type: Number, default: 50 },
    penaltyXP: { type: Number, default: 10 },
    isEnabled: { type: Boolean, default: true },
    lastProcessedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemRule", systemRuleSchema);
