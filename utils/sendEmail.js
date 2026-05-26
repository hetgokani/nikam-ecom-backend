const nodemailer = require("nodemailer");
const EmailSetting = require("../models/EmailSetting");
const { decrypt } = require("./encryption");

const sendEmail = async (to, subject, html) => {
  try {
    // GET SMTP SETTINGS
    const settings = await EmailSetting.findOne();

    if (!settings) {
      throw new Error("SMTP Settings not configured by Admin.");
    }

    // DECRYPT PASSWORD
    const decryptedPassword = decrypt({
      iv: settings.iv,
      encryptedData: settings.appPassword,
    });

    console.log("EMAIL:", settings.email);
    console.log("APP PASSWORD:", decryptedPassword);

    // SMTP TRANSPORTER
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

    // VERIFY SMTP CONNECTION
    await transporter.verify();

    console.log("SMTP VERIFIED SUCCESSFULLY");

    // SEND EMAIL
    const mailOptions = {
      from: `"${settings.senderName}" <${settings.email}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("EMAIL SENT:", info.response);

    return true;
  } catch (error) {
    console.error("FULL EMAIL ERROR:", error);

    throw new Error(error.message);
  }
};

module.exports = sendEmail;
