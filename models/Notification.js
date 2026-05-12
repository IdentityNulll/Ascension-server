const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "SYSTEM_QUEST_AVAILABLE",
        "SYSTEM_SHOP_AVAILABLE",
        "PARTY_INVITATION",
        "PARTY_VERIFICATION_REQUEST",
        "PROOF_APPROVED",
        "PROOF_REJECTED",
        "XP_EVENT",
        "DAILY_GIFT",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
