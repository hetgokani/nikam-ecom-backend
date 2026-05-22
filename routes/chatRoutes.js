const express = require("express");
const router = express.Router();
const {
  createTicket,
  getMyTickets,
  getAllTickets,
  addMessage,
  closeTicket,
} = require("../controllers/chatController");

// Authentication is verified via JWT inside the controller directly.
router.post("/ticket", createTicket);
router.get("/my-tickets", getMyTickets);
router.get("/all", getAllTickets);
router.post("/:ticketId/message", addMessage);
router.put("/:ticketId/close", closeTicket);

module.exports = router;
