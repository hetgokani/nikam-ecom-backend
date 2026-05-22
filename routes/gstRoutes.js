const express = require("express");
const router = express.Router();
const {
  addGstRate,
  getGstRates,
  updateGstRate,
  deleteGstRate,
  getUniversalTax,
  updateUniversalTax,
} = require("../controllers/gstController");

// THESE MUST BE ABOVE /:id ROUTES
router.get("/universal", getUniversalTax);
router.post("/universal", updateUniversalTax);

router.post("/", addGstRate);
router.get("/", getGstRates);
router.put("/:id", updateGstRate);
router.delete("/:id", deleteGstRate);

module.exports = router;
