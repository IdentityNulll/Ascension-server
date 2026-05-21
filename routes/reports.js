const router = require("express").Router();
const { getMonthlyReport } = require("../controllers/reportController");
const { protect } = require("../middleware/auth");

router.get("/monthly", protect, getMonthlyReport);

module.exports = router;
