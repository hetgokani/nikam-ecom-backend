// models/Coupon.js
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String },
    discountType: {
      type: String,
      enum: ["Percentage", "Fixed Amount"],
      required: true,
    },
    discountValue: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number }, // For percentage coupons (e.g., 50% off up to ₹500)
    expiryDate: { type: Date },

    // Targeting
    applyTo: {
      type: String,
      enum: ["All Products", "Specific Categories", "Specific Products"],
      default: "All Products",
    },
    selectedCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ],
    selectedProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Coupon", couponSchema);
