const router = require("express").Router();
const c = require("../controllers/verificationController");
const { protect } = require("../middleware/auth");
router.get("/pending", protect, c.getPending);
router.get("/party/:id", protect, c.getPartyVerifications);
router.post("/:id/approve", protect, c.approve);
router.post("/:id/reject", protect, c.reject);
module.exports = router;
