const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // Stores specific combinations like [{name: "Size", value: "UK 7"}]
    attributes: [
      {
        name: String,
        value: String,
      },
    ],
    price: { type: Number, default: 0 },
    discountPrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    sku: { type: String },
    images: [String],
    // WooCommerce style default selector
    isDefault: { type: Boolean, default: false },
    sgst: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    // NEW FIELD FOR TAGS (Acts just like Brand)
    tag: { type: mongoose.Schema.Types.ObjectId, ref: "Tag" },
  },
  { timestamps: true }
);

// --- Add this near the bottom of models/Variant.js ---

// Virtual to populate reviews dynamically without changing the actual database structure
variantSchema.virtual("reviews", {
  ref: "Review", // The name of the Review model
  localField: "_id", // The ID of the Variant
  foreignField: "variant", // The field in the Review model that holds the Variant ID
});

// Ensure virtuals are included when converting to JSON/Object for the frontend
variantSchema.set("toObject", { virtuals: true });
variantSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Variant", variantSchema);
