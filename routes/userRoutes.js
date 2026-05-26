const express = require("express");
const {
  register,
  login,
  logout,
  sendRegistrationOtp,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/auth"); // Your updated middleware
const {
  sendForgotPasswordOtp,
  resetPassword,
} = require("../controllers/authController");
const router = express.Router();

// The middleware here checks for a cookie BEFORE the register function runs
router.post("/register", register);
router.post("/send-otp", sendRegistrationOtp);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password-otp", sendForgotPasswordOtp);
router.post("/reset-password", resetPassword);
module.exports = router;
