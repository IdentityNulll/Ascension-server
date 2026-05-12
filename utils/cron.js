const cron = require("node-cron");
const User = require("../models/User");
const Record = require("../models/Record");
const SystemRule = require("../models/SystemRule");
const { subtractXP } = require("./xp");
const { createRecord } = require("./record");
const { createNotification } = require("../controllers/notificationController");

const initCron = () => {
  // Run every day at 23:59
  cron.schedule("59 23 * * *", async () => {
    console.log("[CRON] Starting daily XP penalty check...");
    try {
      const rule = await SystemRule.findOne({ type: "DAILY_XP_MINIMUM" });
      if (!rule || !rule.isEnabled) {
        console.log("[CRON] Daily XP rule disabled or not found.");
        return;
      }

      const users = await User.find({ isActive: true });
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      for (const user of users) {
        // Calculate XP gained today (only positive changes)
        const records = await Record.find({
          userId: user._id,
          xpChange: { $gt: 0 },
          createdAt: { $gte: startOfDay }
        });

        const totalGainedToday = records.reduce((sum, r) => sum + r.xpChange, 0);

        if (totalGainedToday < rule.minXP) {
          console.log(`[CRON] User ${user.username} gained ${totalGainedToday} XP, which is less than ${rule.minXP}. Applying penalty.`);
          
          await subtractXP(user._id, rule.penaltyXP);
          
          await createRecord({
            userId: user._id,
            action: "SYSTEM_RULE_PENALTY",
            targetType: "SYSTEM",
            xpChange: -rule.penaltyXP,
            message: `You did not reach today's XP goal. -${rule.penaltyXP} XP applied.`,
            metadata: { 
              ruleType: "DAILY_XP_MINIMUM", 
              gainedToday: totalGainedToday, 
              target: rule.minXP 
            }
          });

          await createNotification({
            userId: user._id,
            type: "SYSTEM_RULE_PENALTY",
            title: "Daily XP Penalty",
            message: `You did not reach today's XP goal (${totalGainedToday}/${rule.minXP}). -${rule.penaltyXP} XP applied.`,
            link: "/app/rules"
          });
        }
      }

      rule.lastProcessedAt = new Date();
      await rule.save();
      console.log("[CRON] Daily XP penalty check complete.");
    } catch (err) {
      console.error("[CRON] Error in daily XP penalty check:", err);
    }
  });
};

module.exports = { initCron };
