const nodemailer = require("nodemailer");
const EmailSetting = require("../models/EmailSetting");
const { decrypt } = require("./encryption");

const sendEmail = async (to, subject, html) => {
  try {
    const settings = await EmailSetting.findOne();
    if (!settings) throw new Error("SMTP Settings not configured by Admin.");

    const decryptedPassword = decrypt({
      iv: settings.iv,
      encryptedData: settings.appPassword,
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      family: 4, // FORCE IPV4
      auth: {
        user: settings.email,
        pass: decryptedPassword,
      },
    });

    const mailOptions = {
      from: `"${settings.senderName}" <${settings.email}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Email Error:", error.message);
    throw new Error(error.message);
  }
};

module.exports = sendEmail;
