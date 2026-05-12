const router = require("express").Router();
const c = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

router.get("/", protect, c.getNotifications);
router.patch("/:id/read", protect, c.markAsRead);
router.patch("/read-all", protect, c.markAllRead);
router.delete("/:id", protect, c.deleteNotification);

module.exports = router;
