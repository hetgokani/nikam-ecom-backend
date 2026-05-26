const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const token = req.cookies.token;

  // If no token, we don't error out yet (this allows public registration)
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🛡️ CRITICAL: populate("role") allows us to check req.user.role.rolename
    const user = await User.findById(decoded.id).populate("role");

    if (user) {
      // We attach a flat rolename for easier checking in the controller
      user.rolename = user.role ? user.role.rolename : "user";
      req.user = user;
    }
    next();
  } catch (error) {
    // 🛡️ THE FIX: If the token is expired or tampered with, DO NOT proceed as a guest.
    // Return 401. This perfectly triggers your AuthContext interceptor to log the user out.
    res.clearCookie("token"); // Clears the dead token from cookies
    return res
      .status(401)
      .json({ message: "Session expired. Please log in again." });
  }
};
