const mongoose = require("mongoose");

// Defines how THIS specific product uses the global attributes
const productAttributeSchema = new mongoose.Schema(
  {
    attribute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attribute",
      required: true,
    },
    selectedTerms: [{ type: String }], // Array of values like ["uk-7", "uk-8"]
    isVariantKey: { type: Boolean, default: true }, // "Used for variations"
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,

    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    subcategory: { type: mongoose.Schema.Types.ObjectId },

    vendor: String,
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // The dynamic container
    productAttributes: [productAttributeSchema],

    thumbnail: String,
    gallery: [String],
  },
  { timestamps: true },
);
// ADD THIS: Define a virtual property 'variants'
productSchema.virtual("variants", {
  ref: "Variant", // The model to join with
  localField: "_id", // The ID from the Product collection
  foreignField: "productId", // The field in Variant that stores the Product ID
});

// ADD THIS: Ensure virtuals are included when converting to JSON for the frontend
productSchema.set("toObject", { virtuals: true });
productSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
