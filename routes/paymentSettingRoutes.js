const express = require("express");
const {
  savePaymentSettings,
  getPaymentSettings,
} = require("../controllers/paymentSettingController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.post("/", authMiddleware, savePaymentSettings);
router.get("/", authMiddleware, getPaymentSettings);

module.exports = router;
