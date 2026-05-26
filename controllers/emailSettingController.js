const EmailSetting = require("../models/EmailSetting");
const { encrypt } = require("../utils/encryption");

exports.saveEmailSettings = async (req, res) => {
  // Ensure only admin/superadmin can do this
  if (
    !req.user ||
    (req.user.rolename !== "superadmin" && req.user.rolename !== "admin")
  ) {
    return res.status(403).json({ message: "Access Denied: Admins only" });
  }

  const { senderName, email, appPassword } = req.body;

  try {
    const encryptedData = encrypt(appPassword);

    // Check if settings already exist, update if they do
    let settings = await EmailSetting.findOne();
    if (settings) {
      settings.senderName = senderName;
      settings.email = email;
      settings.appPassword = encryptedData.encryptedData;
      settings.iv = encryptedData.iv;
      await settings.save();
    } else {
      settings = await EmailSetting.create({
        senderName,
        email,
        appPassword: encryptedData.encryptedData,
        iv: encryptedData.iv,
      });
    }

    res
      .status(200)
      .json({ status: "success", message: "SMTP Settings saved securely!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmailSettings = async (req, res) => {
  if (
    !req.user ||
    (req.user.rolename !== "superadmin" && req.user.rolename !== "admin")
  ) {
    return res.status(403).json({ message: "Access Denied: Admins only" });
  }

  try {
    const settings = await EmailSetting.findOne();
    if (!settings)
      return res.status(404).json({ message: "Settings not found" });

    // NEVER send the password back to frontend, even encrypted. Just send existence.
    res.status(200).json({
      status: "success",
      data: {
        senderName: settings.senderName,
        email: settings.email,
        isConfigured: true,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
