const User = require("../models/User");
const Role = require("../models/role");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Otp = require("../models/Otp"); // NEW
const sendEmail = require("../utils/sendEmail"); // NEW

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// ================= NEW OTP FUNCTION =================
exports.sendRegistrationOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB (overwrites existing unverified OTP for this email)
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });

    // Send Email
    const message = `<h2>Welcome to Nikam Organic!</h2>
                     <p>Your OTP for registration is: <strong>${otp}</strong></p>
                     <p>This code will expire in 5 minutes.</p>`;

    await sendEmail(email, "Registration OTP - Nikam Organic ", message);

    res
      .status(200)
      .json({ status: "success", message: "OTP sent successfully" });
  } catch (error) {
    // If SMTP fails, clear the OTP from DB
    await Otp.deleteMany({ email });
    res.status(500).json({ message: error.message });
  }
};
// ====================================================

exports.register = async (req, res) => {
  const { name, email, password, confirmpassword, role, otp } = req.body; // Added otp

  // ================= NEW OTP VERIFICATION CHECK =================
  if (!otp) return res.status(400).json({ message: "OTP is required" });

  const validOtp = await Otp.findOne({ email, otp });
  if (!validOtp)
    return res.status(400).json({ message: "Invalid or expired OTP" });
  // ===============================================================

  // Default: everyone is a standard "user"
  let targetRoleName = "user";

  // PRIVILEGE CHECK: Only allow role assignment if the requester is Admin/Superadmin
  if (
    req.user &&
    (req.user.rolename === "superadmin" || req.user.rolename === "admin")
  ) {
    if (role) targetRoleName = role.toLowerCase();
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    // Look for the role in your collection
    const roleDoc = await Role.findOne({ rolename: targetRoleName });

    if (!roleDoc) {
      return res
        .status(500)
        .json({ message: `Role '${targetRoleName}' not found.` });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      confirmpassword,
      role: roleDoc._id,
      rolename: roleDoc.rolename,
    });

    const token = createToken(newUser._id);
    newUser.password = undefined;

    // Delete OTP after successful registration
    await Otp.deleteMany({ email });

    res.status(201).json({ status: "success", token, data: { user: newUser } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... keep your existing exports.login and exports.logout exactly as they were ...
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email })
      .select("+password")
      .populate("role");

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = createToken(user._id);

    // Set cookie for the middleware to read
    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // MUST BE TRUE FOR CROSS-DOMAIN
      sameSite: "none", // STRICTLY REQUIRED FOR CROSS-DOMAIN
      maxAge: 24 * 60 * 60 * 1000,
    });

    user.password = undefined;

    res.status(200).json({
      status: "success",
      token,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};
// Function to send Forgot Password OTP
exports.sendForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ message: "User not found with this email" });

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB (overwrites existing unverified OTP for this email)
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });

    // Send Email using your configured SMTP setup
    const message = `<h2>Password Reset Request</h2>
                     <p>Your OTP for resetting your password is: <strong>${otp}</strong></p>
                     <p>This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>`;

    await sendEmail(email, "Password Reset OTP - Nikam Organic", message);

    res
      .status(200)
      .json({ status: "success", message: "OTP sent successfully" });
  } catch (error) {
    await Otp.deleteMany({ email });
    res.status(500).json({ message: error.message });
  }
};

// Function to actually Reset the Password
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(400)
      .json({ message: "Please provide all required fields" });
  }

  try {
    // 1. Verify OTP
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    // 2. Find User
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // 3. Update Password
    // Because we use a pre('save') hook in your User schema, simply setting it and saving will hash it!
    user.password = newPassword;
    user.confirmpassword = newPassword; // bypass validation logic if it exists in schema
    await user.save();

    // 4. Delete OTP after successful reset
    await Otp.deleteMany({ email });

    res
      .status(200)
      .json({ status: "success", message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
