const router = require("express").Router();
const c = require("../controllers/ruleController");
const { protect } = require("../middleware/auth");
router.get("/", protect, c.getRules);
router.post("/", protect, c.createRule);
router.patch("/:id", protect, c.updateRule);
router.delete("/:id", protect, c.deleteRule);
router.post("/:id/break", protect, c.breakRule);
module.exports = router;
