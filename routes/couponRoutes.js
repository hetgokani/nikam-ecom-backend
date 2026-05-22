// routes/couponRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/couponController");

// ---------------------------------------------------------
// ADMIN CRUD ROUTES
// ---------------------------------------------------------

// GET: Fetch all coupons for the admin dashboard list
router.get("/all", controller.getCoupons);

// POST: Create a new coupon (targets All, Specific Products, or Categories)
router.post("/create", controller.createCoupon);

// PUT: Update an existing coupon (e.g., change expiry or status)
router.put("/update/:id", controller.updateCoupon);

// DELETE: Remove a coupon from the system
router.delete("/delete/:id", controller.deleteCoupon);

// ---------------------------------------------------------
// USER / CHECKOUT ROUTES
// ---------------------------------------------------------

// POST: Validates the code, checks expiry, min order, and product eligibility
// This is what the SneakersWala checkout page will call.
router.post("/validate", controller.validateCoupon);

module.exports = router;
