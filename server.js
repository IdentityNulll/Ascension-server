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

const app = express();

app.use(cors());
app.use(express.json());
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/ascension")
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
