require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Quest = require("./models/Quest");
const Rule = require("./models/Rule");
const ShopItem = require("./models/ShopItem");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ascension");
  console.log("Connected to MongoDB");

  // Admin user
  let admin = await User.findOne({ email: "admin@ascension.dev" });
  if (!admin) {
    admin = await User.create({ username: "admin", email: "admin@ascension.dev", password: "admin123456", role: "ADMIN" });
    console.log("Created admin user: admin@ascension.dev / admin123456");
  } else {
    console.log("Admin already exists");
  }

  // System Quests
  const existingQuests = await Quest.countDocuments({ isSystem: true });
  if (existingQuests === 0) {
    await Quest.insertMany([
      { title: "Morning Workout", description: "Complete a 30-minute workout session", category: "Fitness", xpReward: 80, type: "SYSTEM", isSystem: true, cooldownHours: 24, createdBy: admin._id },
      { title: "Read for 30 Minutes", description: "Read a book or educational material for at least 30 minutes", category: "Learning", xpReward: 50, type: "SYSTEM", isSystem: true, cooldownHours: 24, createdBy: admin._id },
      { title: "Cold Shower", description: "Take a cold shower for at least 2 minutes", category: "Discipline", xpReward: 40, type: "SYSTEM", isSystem: true, cooldownHours: 24, createdBy: admin._id },
      { title: "Meditate", description: "Complete a 10-minute meditation session", category: "Mindfulness", xpReward: 35, type: "SYSTEM", isSystem: true, cooldownHours: 24, createdBy: admin._id },
      { title: "No Social Media Day", description: "Avoid all social media for a full day", category: "Discipline", xpReward: 100, type: "SYSTEM", isSystem: true, cooldownHours: 24, createdBy: admin._id },
    ]);
    console.log("Created 5 system quests");
  }

  // System Rules
  const existingRules = await Rule.countDocuments({ isSystem: true });
  if (existingRules === 0) {
    await Rule.insertMany([
      { title: "No Junk Food", description: "Do not consume junk food or sugary drinks today", xpPenalty: 30, isSystem: true, createdBy: admin._id },
      { title: "Sleep Before Midnight", description: "Must be in bed before midnight", xpPenalty: 25, isSystem: true, createdBy: admin._id },
      { title: "No Procrastination", description: "Complete at least one important task without procrastinating", xpPenalty: 40, isSystem: true, createdBy: admin._id },
    ]);
    console.log("Created 3 system rules");
  }

  // System Shop Items
  const existingShop = await ShopItem.countDocuments({ isSystem: true });
  if (existingShop === 0) {
    await ShopItem.insertMany([
      { title: "Cheat Meal", description: "Reward yourself with one guilt-free cheat meal", xpCost: 150, isSystem: true, cooldownHours: 168, createdBy: admin._id },
      { title: "Rest Day", description: "Take a full day off from all quests", xpCost: 200, isSystem: true, cooldownHours: 168, createdBy: admin._id },
      { title: "Gaming Session", description: "Guilt-free 2-hour gaming session", xpCost: 100, isSystem: true, cooldownHours: 72, createdBy: admin._id },
      { title: "Movie Night", description: "Watch a full movie without guilt", xpCost: 80, isSystem: true, cooldownHours: 48, createdBy: admin._id },
    ]);
    console.log("Created 4 system shop items");
  }

  console.log("\nSeed complete!");
  console.log("Admin login: admin@ascension.dev / admin123456");
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
