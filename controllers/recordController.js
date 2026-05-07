const Record = require("../models/Record");

const getRange = (range) => {
  const now = new Date();
  if (range === "today") return new Date(now.setHours(0, 0, 0, 0));
  if (range === "week") return new Date(now - 7 * 86400000);
  if (range === "month") return new Date(now - 30 * 86400000);
  return null;
};

exports.getRecords = async (req, res) => {
  try {
    const { range, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user._id };
    const since = getRange(range);
    if (since) filter.createdAt = { $gte: since };
    if (startDate && endDate) filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    if (type) filter.action = type;
    const records = await Record.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    const total = await Record.countDocuments(filter);
    const xpSummary = await Record.aggregate([
      { $match: filter },
      { $group: { _id: null, gained: { $sum: { $max: ["$xpChange", 0] } }, lost: { $sum: { $min: ["$xpChange", 0] } } } },
    ]);
    res.json({ success: true, data: { records, total, xpSummary: xpSummary[0] || { gained: 0, lost: 0 } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
