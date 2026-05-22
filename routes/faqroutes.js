const express = require("express");
const router = express.Router();
const {
  addFaq,
  getAllFaqs,
  updateFaq,
  deleteFaq,
} = require("../controllers/faqcontroller");

router.post("/add", addFaq);
router.get("/all", getAllFaqs);
router.put("/update/:id", updateFaq);
router.delete("/delete/:id", deleteFaq);

module.exports = router;
