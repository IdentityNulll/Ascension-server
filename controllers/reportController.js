const Record = require("../models/Record");
const Quest = require("../models/Quest");
const mongoose = require("mongoose");

// Helper to format dates in specific timezones to YYYY-MM-DD
const formatInTimezone = (date, tz) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // returns YYYY-MM-DD
  } catch (e) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  }
};

exports.getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1); // 1-indexed (1-12)
    const timezone = req.query.timezone || "UTC";

    // Date range buffers to ensure we fetch records around month boundaries
    const startOfRange = new Date(Date.UTC(year, month - 2, 20));
    const endOfRange = new Date(Date.UTC(year, month + 1, 10));

    // Fetch records in this buffered range
    const allRecords = await Record.find({
      userId,
      createdAt: { $gte: startOfRange, $lte: endOfRange },
    }).sort({ createdAt: 1 });

    // Filter to keep only records that fall in target month based on client timezone
    const monthlyRecords = [];
    const dailyData = {}; // day -> { xpGained, xpLost, completions: { [questId]: xpEarned } }

    // Initialize all days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      dailyData[d] = {
        xpGained: 0,
        xpLost: 0,
        completions: {},
      };
    }

    for (const record of allRecords) {
      const dateStr = formatInTimezone(record.createdAt, timezone);
      const [rYear, rMonth, rDay] = dateStr.split("-").map(Number);

      if (rYear === year && rMonth === month) {
        monthlyRecords.push(record);
        
        // Ensure day entry exists
        if (!dailyData[rDay]) {
          dailyData[rDay] = { xpGained: 0, xpLost: 0, completions: {} };
        }

        // Calculate positive and negative XP changes
        if (record.xpChange > 0) {
          dailyData[rDay].xpGained += record.xpChange;
        } else if (record.xpChange < 0) {
          dailyData[rDay].xpLost += Math.abs(record.xpChange); // keep absolute value for UI ease
        }

        // Track completed quests
        if (record.action === "QUEST_APPROVED" && record.targetType === "QUEST" && record.targetId) {
          const qIdStr = record.targetId.toString();
          dailyData[rDay].completions[qIdStr] = (dailyData[rDay].completions[qIdStr] || 0) + record.xpChange;
        }
      }
    }

    // Fetch active quests of the user and system quests
    const activeQuests = await Quest.find({
      $or: [
        { createdBy: userId, type: "SOLO" },
        { isSystem: true, type: "SYSTEM" },
      ],
    });

    // Identify quests that are not active/present but were completed this month
    const completedQuestIds = [
      ...new Set(
        monthlyRecords
          .filter((r) => r.action === "QUEST_APPROVED" && r.targetType === "QUEST" && r.targetId)
          .map((r) => r.targetId.toString())
      ),
    ];

    const completedQuestsFromDb = await Quest.find({ _id: { $in: completedQuestIds } });

    // Map existing/active quests
    const questMap = {};
    for (const q of activeQuests) {
      questMap[q._id.toString()] = {
        _id: q._id,
        title: q.title,
        category: q.category || "General",
        xpReward: q.xpReward,
        status: q.status,
      };
    }

    // Add/overwrite completed quests from DB
    for (const q of completedQuestsFromDb) {
      questMap[q._id.toString()] = {
        _id: q._id,
        title: q.title,
        category: q.category || "General",
        xpReward: q.xpReward,
        status: q.status,
      };
    }

    // Find and recover details of deleted quests that were completed
    for (const qIdStr of completedQuestIds) {
      if (!questMap[qIdStr]) {
        // Fallback title recovery from submission logs in all user records
        let recoveredTitle = "Deleted Quest";
        const submitRecord = allRecords.find(
          (r) => r.action === "PROOF_SUBMITTED" && r.targetId && r.targetId.toString() === qIdStr
        );
        if (submitRecord && submitRecord.message) {
          const match = submitRecord.message.match(/Proof submitted for:\s*(.*)/);
          if (match && match[1]) {
            recoveredTitle = match[1];
          }
        }

        // Get reward amount from the approval record
        const approvalRecord = monthlyRecords.find(
          (r) => r.action === "QUEST_APPROVED" && r.targetType === "QUEST" && r.targetId && r.targetId.toString() === qIdStr
        );
        const xpReward = approvalRecord ? approvalRecord.xpChange : 0;

        questMap[qIdStr] = {
          _id: qIdStr,
          title: recoveredTitle,
          category: "Historical / Other",
          xpReward,
          status: "DELETED",
        };
      }
    }

    // Final list of quests and category set
    const questsList = Object.values(questMap);
    const categorySet = new Set();
    for (const q of questsList) {
      categorySet.add(q.category);
    }
    const categoriesList = Array.from(categorySet);

    // Calculate overall summaries
    let totalXPGained = 0;
    let totalXPLost = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      totalXPGained += dailyData[d].xpGained;
      totalXPLost += dailyData[d].xpLost;
    }
    const netXP = totalXPGained - totalXPLost;

    res.json({
      success: true,
      data: {
        year,
        month,
        daysInMonth,
        categories: categoriesList,
        quests: questsList,
        dailyData,
        summary: {
          totalXPGained,
          totalXPLost,
          netXP,
        },
      },
    });
  } catch (err) {
    console.error("getMonthlyReport error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
