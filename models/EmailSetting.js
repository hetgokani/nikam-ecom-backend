const mongoose = require("mongoose");

const emailSettingSchema = new mongoose.Schema(
  {
    senderName: { type: String, required: true },
    email: { type: String, required: true },
    appPassword: { type: String, required: true }, // Encrypted
    iv: { type: String, required: true }, // Initialization vector for decryption
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailSetting", emailSettingSchema);
