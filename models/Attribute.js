const mongoose = require("mongoose");

const termSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
    colorCode: { type: String },
    image: { type: String },
    label: { type: String },
  },
  { _id: true },
);

const attributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["button", "color", "image", "radio"],
      default: "button",
    },
    // NEW FIELD ADDED HERE
    displayAsDropdown: {
      type: Boolean,
      default: false,
    },
    terms: [termSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Attribute", attributeSchema);
