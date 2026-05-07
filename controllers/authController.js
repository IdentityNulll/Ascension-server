const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { createRecord } = require("../utils/record");

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: "All fields required" });
    if (password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(409).json({ success: false, message: existing.email === email ? "Email already in use" : "Username already taken" });
    const user = await User.create({ username, email, password });
    await createRecord({ userId: user._id, action: "REGISTER", targetType: "AUTH", message: "User registered" });
    const token = signToken(user._id);
    res.status(201).json({ success: true, data: { token, user } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ success: false, message: "Invalid credentials" });
    if (!user.isActive) return res.status(403).json({ success: false, message: "Account disabled" });
    user.lastLoginAt = new Date();
    await user.save();
    await createRecord({ userId: user._id, action: "LOGIN", targetType: "AUTH", message: "User logged in" });
    const token = signToken(user._id);
    res.json({ success: true, data: { token, user } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, data: req.user });
};
