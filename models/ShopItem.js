const mongoose = require("mongoose");

const shopItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    xpCost: { type: Number, required: true, min: 1, max: 100000 },
    isSystem: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    cooldownHours: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShopItem", shopItemSchema);
