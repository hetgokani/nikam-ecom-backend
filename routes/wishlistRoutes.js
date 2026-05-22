const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlistController");
const authMiddleware = require("../middleware/auth");

// All wishlist routes require the user to be logged in
router.use(authMiddleware);

router.get("/", wishlistController.getWishlist);
router.post("/add", wishlistController.addToWishlist);
router.delete("/remove/:itemId", wishlistController.removeFromWishlist);

module.exports = router;
