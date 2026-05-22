const mongoose = require("mongoose");

// Subcategory Schema
const subcategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }, // Changed to true so sub-items have unique IDs (better for updates)
);

// Main Category Schema
const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Ensures no duplicate category names
    },
    order: {
      type: Number,
      default: 0,
    },
    subcategories: [subcategorySchema],
  },
  { timestamps: true }, // Automatically manages createdAt and updatedAt
);

module.exports = mongoose.model("Category", categorySchema);
