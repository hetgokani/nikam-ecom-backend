const express = require("express");
const { register, login, logout } = require("../controllers/authController");
const authMiddleware = require("../middleware/auth"); // Your updated middleware

const router = express.Router();

// The middleware here checks for a cookie BEFORE the register function runs
router.post("/register", authMiddleware, register);

router.post("/login", login);
router.post("/logout", logout);

module.exports = router;
