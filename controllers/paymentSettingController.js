const RazorpaySetting = require("../models/RazorpaySetting");
const { encrypt } = require("../utils/encryption"); // Reusing the encryption utility we made for Email

exports.savePaymentSettings = async (req, res) => {
  if (
    !req.user ||
    (req.user.rolename !== "superadmin" && req.user.rolename !== "admin")
  ) {
    return res.status(403).json({ message: "Access Denied: Admins only" });
  }

  const { keyId, keySecret } = req.body;

  try {
    const encryptedData = encrypt(keySecret);

    let settings = await RazorpaySetting.findOne();
    if (settings) {
      settings.keyId = keyId;
      settings.keySecret = encryptedData.encryptedData;
      settings.iv = encryptedData.iv;
      await settings.save();
    } else {
      settings = await RazorpaySetting.create({
        keyId,
        keySecret: encryptedData.encryptedData,
        iv: encryptedData.iv,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Razorpay Settings saved securely!",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPaymentSettings = async (req, res) => {
  if (
    !req.user ||
    (req.user.rolename !== "superadmin" && req.user.rolename !== "admin")
  ) {
    return res.status(403).json({ message: "Access Denied" });
  }

  try {
    const settings = await RazorpaySetting.findOne();
    if (!settings)
      return res.status(404).json({ message: "Settings not found" });

    res.status(200).json({
      status: "success",
      data: { keyId: settings.keyId, isConfigured: true }, // NEVER send the secret back!
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
