const ShopItem = require("../models/ShopItem");
const { createRecord } = require("../utils/record");
const { subtractXP } = require("../utils/xp");
const User = require("../models/User");

exports.getItems = async (req, res) => {
  try {
    const items = await ShopItem.find({ $or: [{ createdBy: req.user._id }, { isSystem: true }] }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createItem = async (req, res) => {
  try {
    const { title, description, xpCost, cooldownHours } = req.body;
    if (!title || !xpCost) return res.status(400).json({ success: false, message: "Title and XP cost required" });
    const item = await ShopItem.create({ title, description, xpCost: Number(xpCost), cooldownHours: Number(cooldownHours) || 0, createdBy: req.user._id });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await ShopItem.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    const { title, description, xpCost, cooldownHours } = req.body;
    if (title) item.title = title;
    if (description !== undefined) item.description = description;
    if (xpCost) item.xpCost = Number(xpCost);
    if (cooldownHours !== undefined) item.cooldownHours = Number(cooldownHours);
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await ShopItem.findOne({ _id: req.params.id, createdBy: req.user._id, isSystem: false });
    if (!item) return res.status(404).json({ success: false, message: "Item not found or cannot be deleted" });
    await item.deleteOne();
    res.json({ success: true, message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.buyItem = async (req, res) => {
  try {
    const item = await ShopItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    const user = await User.findById(req.user._id);
    if (user.xp < item.xpCost) return res.status(400).json({ success: false, message: "Not enough XP" });
    const updatedUser = await subtractXP(req.user._id, item.xpCost);
    await createRecord({ userId: req.user._id, action: "SHOP_PURCHASE", targetType: "SHOP", targetId: item._id, xpChange: -item.xpCost, message: `Purchased: ${item.title}. -${item.xpCost} XP` });
    res.json({ success: true, data: { xp: updatedUser.xp, xpChange: -item.xpCost } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
