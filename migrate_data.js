const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ascension';

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const VerificationRequest = mongoose.connection.collection('verificationrequests');
    const Record = mongoose.connection.collection('records');

    // 1. Normalize VerificationRequests (PascalCase)
    console.log("Normalizing VerificationRequests...");
    const vq1 = await VerificationRequest.updateMany(
      { targetType: { $in: ["QUEST", "quest"] } },
      { $set: { targetType: "Quest" } }
    );
    const vq2 = await VerificationRequest.updateMany(
      { targetType: { $in: ["BAD_HABIT", "badhabit"] } },
      { $set: { targetType: "BadHabit" } }
    );
    console.log(`Updated ${vq1.modifiedCount} Quests and ${vq2.modifiedCount} BadHabits in Verifications.`);

    // 2. Normalize Records (UPPERCASE)
    console.log("Normalizing Records...");
    const r1 = await Record.updateMany(
      { targetType: { $in: ["Quest", "quest"] } },
      { $set: { targetType: "QUEST" } }
    );
    const r2 = await Record.updateMany(
      { targetType: { $in: ["BadHabit", "badhabit"] } },
      { $set: { targetType: "BAD_HABIT" } }
    );
    console.log(`Updated ${r1.modifiedCount} Quests and ${r2.modifiedCount} BadHabits in Records.`);

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
