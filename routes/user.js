const router = require("express").Router();
const { dashboard, profile, updateProfile } = require("../controllers/userController");
const { protect } = require("../middleware/auth");
router.get("/dashboard", protect, dashboard);
router.get("/profile", protect, profile);
router.patch("/profile", protect, updateProfile);
module.exports = router;
