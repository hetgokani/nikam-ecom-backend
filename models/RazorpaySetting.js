const mongoose = require("mongoose");

const razorpaySettingSchema = new mongoose.Schema(
  {
    keyId: { type: String, required: true },
    keySecret: { type: String, required: true }, // Will be stored ENCRYPTED
    iv: { type: String, required: true }, // Decryption vector
  },
  { timestamps: true }
);

module.exports = mongoose.model("RazorpaySetting", razorpaySettingSchema);
