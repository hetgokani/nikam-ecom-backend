const express = require("express");
const router = express.Router();
const {
  submitContact,
  getMessages,
  deleteMessage,
} = require("../controllers/contactController");
const contactController = require("../controllers/contactController");

router.post("/submit", submitContact);
router.get("/all", getMessages);
router.delete("/:id", deleteMessage);
router.get("/new-count", contactController.getNewContactCount);
module.exports = router;
