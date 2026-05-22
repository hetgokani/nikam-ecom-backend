const express = require("express");
const router = express.Router();
const {
  submitContact,
  getMessages,
  deleteMessage,
} = require("../controllers/contactcontroller");

router.post("/submit", submitContact);
router.get("/all", getMessages);
router.delete("/:id", deleteMessage);

module.exports = router;
