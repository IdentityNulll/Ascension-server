const PartyShopItem = require("../models/PartyShopItem");
const Party = require("../models/Party");
const { createRecord } = require("../utils/record");
const { createNotification } = require("./notificationController");

const isMember = (party, userId) =>
  party.members.some((m) => {
    const mId = m.userId?._id ? m.userId._id.toString() : (m.userId?.toString() || "");
    return mId === userId.toString();
  });

const isAdminOrOwner = (party, userId) => {
  if (party.ownerId.toString() === userId.toString()) return true;
  const member = party.members.find(m => (m.userId?._id || m.userId).toString() === userId.toString());
  return member?.role === "ADMIN" || member?.role === "OWNER";
};

exports.getShopItems = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party || !isMember(party, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a member" });
    }
    const items = await PartyShopItem.find({ partyId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createShopItem = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party || !isAdminOrOwner(party, req.user._id)) {
      return res.status(403).json({ success: false, message: "Only owners or admins can create shop items" });
    }
    const { title, description, xpCost } = req.body;
    if (!title || !xpCost) {
      return res.status(400).json({ success: false, message: "Title and XP cost required" });
    }
    const item = await PartyShopItem.create({
      title,
      description,
      xpCost: Number(xpCost),
      partyId: party._id,
      createdBy: req.user._id,
    });
    await createRecord({
      userId: req.user._id,
      partyId: party._id,
      action: "PARTY_SHOP_ITEM_CREATED",
      targetType: "SHOP_ITEM",
      targetId: item._id,
      message: `Created party shop item: ${title}`,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateShopItem = async (req, res) => {
  try {
    const item = await PartyShopItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    const party = await Party.findById(item.partyId);
    if (!party || !isAdminOrOwner(party, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const { title, description, xpCost } = req.body;
    if (title) item.title = title;
    if (description !== undefined) item.description = description;
    if (xpCost) item.xpCost = Number(xpCost);
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteShopItem = async (req, res) => {
  try {
    const item = await PartyShopItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    const party = await Party.findById(item.partyId);
    if (!party || !isAdminOrOwner(party, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    await item.deleteOne();
    res.json({ success: true, message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.buyShopItem = async (req, res) => {
  try {
    const item = await PartyShopItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    const party = await Party.findById(item.partyId);
    if (!party || !isMember(party, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not a member" });
    }
    if ((party.totalPartyXP || 0) < item.xpCost) {
      return res.status(400).json({ success: false, message: "Insufficient party XP" });
    }

    party.totalPartyXP -= item.xpCost;
    await party.save();

    await createRecord({
      userId: req.user._id,
      partyId: party._id,
      action: "PARTY_SHOP_PURCHASE",
      targetType: "SHOP_ITEM",
      targetId: item._id,
      message: `${req.user.username} bought ${item.title} from the party shop`,
    });

    // Notify members
    for (const member of party.members) {
      await createNotification({
        userId: member.userId,
        type: "XP_EVENT",
        title: "Party Reward Claimed!",
        message: `${req.user.username} bought "${item.title}" using shared party XP.`,
        link: `/app/party/${party._id}`,
      });
    }

    res.json({ success: true, data: { party, item } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
