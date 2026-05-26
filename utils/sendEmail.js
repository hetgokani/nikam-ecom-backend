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

    // REMOVE SPACES FROM APP PASSWORD
    const cleanPassword = decryptedPassword.replace(/\s+/g, "");

    console.log("EMAIL:", settings.email);
    console.log("APP PASSWORD:", cleanPassword);

    // CREATE TRANSPORTER
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,

      auth: {
        user: settings.email,
        pass: cleanPassword,
      },

      tls: {
        rejectUnauthorized: false,
        family: 4,
      },

      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,

      debug: true,
      logger: true,
    });

    // VERIFY CONNECTION
    await transporter.verify();

    console.log("SMTP VERIFIED SUCCESSFULLY");

    // MAIL OPTIONS
    const mailOptions = {
      from: `"${settings.senderName}" <${settings.email}>`,
      to,
      subject,
      html,
    };

    // SEND EMAIL
    const info = await transporter.sendMail(mailOptions);

    console.log("EMAIL SENT SUCCESSFULLY");
    console.log(info.response);

    return true;
  } catch (error) {
    console.error("FULL EMAIL ERROR:", error);

    throw new Error(error.message);
  }
};

module.exports = sendEmail;
