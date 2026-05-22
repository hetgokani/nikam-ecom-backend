const mongoose = require("mongoose");

const shippingSchema = new mongoose.Schema(
  {
    city: { type: String, required: true },
    pincode: { type: String, required: true, unique: true },
    shippingPrice: { type: Number, required: true, default: 0 },
    deliveryDuration: { type: String, default: "3-5 Days" },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shipping", shippingSchema);
