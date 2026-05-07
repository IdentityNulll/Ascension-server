const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, ref: "Party", default: null },
    action: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["QUEST", "BAD_HABIT", "RULE", "SHOP", "PARTY", "AUTH", "SYSTEM"],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    xpChange: { type: Number, default: 0 },
    message: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Record", recordSchema);
