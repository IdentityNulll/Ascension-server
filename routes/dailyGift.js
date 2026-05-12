const router = require("express").Router();
const c = require("../controllers/dailyGiftController");
const { protect } = require("../middleware/auth");

router.get("/status", protect, c.getStatus);
router.post("/claim", protect, c.claimGift);

module.exports = router;
