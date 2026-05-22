const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const authMiddleware = require("../middleware/auth");

// ==========================================
// ADMIN ROUTES (MUST GO BEFORE /:variantId)
// ==========================================
router.get("/admin/all", reviewController.getAllReviewsForAdmin);
router.put("/:id/status", reviewController.updateReviewStatus);
router.delete("/:id", reviewController.deleteReview);

// ==========================================
// PUBLIC / USER ROUTES
// ==========================================
// POST: Add a review (requires user to be logged in)
router.post("/:variantId", authMiddleware, reviewController.addReview);

// GET: Fetch approved reviews for a specific variant (publicly visible)
router.get("/:variantId", reviewController.getVariantReviews);

module.exports = router;
