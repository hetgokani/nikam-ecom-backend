const mongoose = require("mongoose");

const gstSchema = new mongoose.Schema(
  {
    taxType: {
      type: String,
      required: [true, "Tax type is required"],
      enum: ["SGST", "CGST"],
    },
    rate: {
      type: Number,
      required: [true, "Tax rate is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GST", gstSchema);
