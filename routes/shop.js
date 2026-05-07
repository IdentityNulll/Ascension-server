const router = require("express").Router();
const c = require("../controllers/shopController");
const { protect } = require("../middleware/auth");
router.get("/", protect, c.getItems);
router.post("/", protect, c.createItem);
router.patch("/:id", protect, c.updateItem);
router.delete("/:id", protect, c.deleteItem);
router.post("/:id/buy", protect, c.buyItem);
module.exports = router;
