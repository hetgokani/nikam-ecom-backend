const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const authMiddleware = require("../middleware/auth");

// All cart routes require the user to be logged in
router.use(authMiddleware);

router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.put("/update/:itemId", cartController.updateQuantity);
router.delete("/remove/:itemId", cartController.removeFromCart);
router.delete("/clear", cartController.clearCart);

module.exports = router;
