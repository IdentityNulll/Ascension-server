require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const questRoutes = require("./routes/quests");
const partyRoutes = require("./routes/parties");
const verificationRoutes = require("./routes/verifications");
const habitRoutes = require("./routes/habits");
const ruleRoutes = require("./routes/rules");
const shopRoutes = require("./routes/shop");
const recordRoutes = require("./routes/records");
const adminRoutes = require("./routes/admin");
const notificationRoutes = require("./routes/notifications");
const reportRoutes = require("./routes/reports");


const { initCron } = require("./utils/cron");

const app = express();
initCron();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/quests", questRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/bad-habits", habitRoutes);
app.use("/api/rules", ruleRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);


const multer = require("multer");
app.use((err, req, res, next) => {
  // Handle multer-specific errors with user-friendly messages
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ success: false, message: "File too large. Maximum size is 10MB." });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  // Handle multer file filter rejections
  if (err.message === "Invalid file type") {
    return res.status(400).json({ success: false, message: "Invalid file type. Allowed: JPG, JPEG, PNG, GIF, WEBP, PDF." });
  }
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
