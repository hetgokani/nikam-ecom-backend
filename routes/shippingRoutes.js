const express = require("express");
const router = express.Router();
const shippingController = require("../controllers/shippingController");
const authMiddleware = require("../middleware/auth"); // Assuming you have this
const multer = require("multer");

// Use memory storage for multer so we can read the buffer directly in the controller
const upload = multer({ storage: multer.memoryStorage() });

router.get("/all", shippingController.getAllShipping);

// Admin Routes (Add adminMiddleware if you have it)
router.post("/upsert", authMiddleware, shippingController.upsertShipping);
router.delete("/:id", authMiddleware, shippingController.deleteShipping);

// Excel routes
router.post(
  "/import",
  authMiddleware,
  upload.single("file"),
  shippingController.importShipping
);
router.get("/export", authMiddleware, shippingController.exportShipping);

module.exports = router;
