const mongoose = require("mongoose");

const partyShopItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    xpCost: { type: Number, required: true, min: 1, max: 100000 },
    partyId: { type: mongoose.Schema.Types.ObjectId, ref: "Party", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PartyShopItem", partyShopItemSchema);
