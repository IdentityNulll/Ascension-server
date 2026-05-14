const mongoose = require("mongoose");

const badHabitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    xpPenalty: { type: Number, required: true, min: 1, max: 10000 },
    type: { type: String, enum: ["SOLO", "PARTY", "SYSTEM"], required: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, ref: "Party", default: null },
    isSystem: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const BadHabit = mongoose.model("BadHabit", badHabitSchema);
mongoose.model("BAD_HABIT", badHabitSchema);
module.exports = BadHabit;
