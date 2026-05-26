const express = require("express");
const {
  saveEmailSettings,
  getEmailSettings,
} = require("../controllers/emailSettingController");
const authMiddleware = require("../middleware/auth"); // Your existing auth

const router = express.Router();

router.post("/", authMiddleware, saveEmailSettings);
router.get("/", authMiddleware, getEmailSettings);

module.exports = router;
