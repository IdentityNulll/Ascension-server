/**
 * Password Reset Script for Ascension
 * ====================================
 * This script resets the admin password to the known value.
 * 
 * WHY THIS IS NEEDED:
 * The admin user "ascension" (a6u6akir0414@gmail.com) has a bcrypt hash
 * in the DB that does NOT match the password "painintheassman". This means
 * either:
 *   1. The user was registered with a different password than what's in seed.js
 *   2. The seed was never run after it was updated with the new password
 *   3. The password was changed at some point
 *
 * This script sets the password to "painintheassman" using the Mongoose model
 * (which triggers the pre-save bcrypt hook to hash it properly).
 *
 * Run: node reset_admin_password.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function resetAdminPassword() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const adminEmail = "mrjasurmc@gmail.com";
  const newPassword = "Jasurbek7909";

  const admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    console.log("❌ No user found with email:", adminEmail);
    await mongoose.disconnect();
    return;
  }

  console.log(`Found user: ${admin.username} (${admin.email})`);
  console.log(`Current role: ${admin.role}`);
  console.log(`Old hash: ${admin.password}`);

  // Set the new password — the pre-save hook will hash it with bcrypt
  admin.password = newPassword;
  // Also ensure the role is ADMIN
  admin.role = "ADMIN";
  await admin.save();

  // Verify the password works now
  const refetched = await User.findOne({ email: adminEmail });
  const matches = await refetched.comparePassword(newPassword);
  console.log(`New hash: ${refetched.password}`);
  console.log(`Password verification: ${matches ? "✅ SUCCESS" : "❌ FAILED"}`);

  await mongoose.disconnect();
  console.log("\nDone. You can now login with:");
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${newPassword}`);
}

resetAdminPassword().catch((err) => {
  console.error(err);
  process.exit(1);
});
