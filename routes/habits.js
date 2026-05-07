const router = require("express").Router();
const c = require("../controllers/habitController");
const { protect } = require("../middleware/auth");
router.get("/", protect, c.getHabits);
router.post("/", protect, c.createHabit);
router.patch("/:id", protect, c.updateHabit);
router.delete("/:id", protect, c.deleteHabit);
router.post("/:id/apply", protect, c.applyHabit);
module.exports = router;
