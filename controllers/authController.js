const User = require("../models/User");
const Role = require("../models/role");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

exports.register = async (req, res) => {
  const { name, email, password, confirmpassword, role } = req.body;

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

    res.status(201).json({ status: "success", token, data: { user: newUser } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
      secure: process.env.NODE_ENV === "production",
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
