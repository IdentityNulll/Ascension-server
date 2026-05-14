const router = require("express").Router();
const c = require("../controllers/partyController");
const { protect } = require("../middleware/auth");
const upload = require("../utils/multer");
const sc = require("../controllers/partyShopController");

router.get("/", protect, c.getParties);
router.post("/", protect, c.createParty);
router.post("/join", protect, c.joinByCode);
router.get("/:id", protect, c.getParty);
router.patch("/:id", protect, c.updateParty);
router.post("/:id/invite", protect, c.inviteMember);
router.post("/:id/leave", protect, c.leaveParty);
router.delete("/:id/members/:userId", protect, c.removeMember);
router.get("/:id/leaderboard", protect, c.getLeaderboard);
router.get("/:id/quests", protect, c.getPartyQuests);
router.post("/:id/quests", protect, c.createPartyQuest);
router.post("/quests/:questId/submit-proof", protect, upload.single("proof"), c.submitPartyProof);
router.delete("/:id", protect, c.deleteParty);

// Party Shop
router.get("/:id/shop", protect, sc.getShopItems);
router.post("/:id/shop", protect, sc.createShopItem);
router.patch("/:id/shop/:itemId", protect, sc.updateShopItem);
router.delete("/:id/shop/:itemId", protect, sc.deleteShopItem);
router.post("/:id/shop/:itemId/buy", protect, sc.buyShopItem);

module.exports = router;
