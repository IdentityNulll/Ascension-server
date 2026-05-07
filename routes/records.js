const router = require("express").Router();
const { getRecords } = require("../controllers/recordController");
const { protect } = require("../middleware/auth");
router.get("/", protect, getRecords);
module.exports = router;
