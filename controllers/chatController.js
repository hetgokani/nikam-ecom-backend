const Ticket = require("../models/Ticket");
const jwt = require("jsonwebtoken");

exports.createTicket = async (req, res) => {
  try {
    const { category, message } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Prevent user from opening multiple tickets
    const existingOpenTicket = await Ticket.findOne({
      user: userId,
      status: "Open",
    });
    if (existingOpenTicket) {
      return res
        .status(400)
        .json({ success: false, message: "You already have an open ticket." });
    }

    const lastTicket = await Ticket.findOne().sort({ createdAt: -1 });
    let newIdNum = 1;

    if (lastTicket && lastTicket.ticketId) {
      const match = lastTicket.ticketId.match(/(\d+)$/);
      if (match) newIdNum = parseInt(match[0]) + 1;
    }

    const ticketId = `SW-${String(newIdNum).padStart(4, "0")}`;

    const newTicket = new Ticket({
      ticketId,
      user: userId,
      category,
      messages: [{ sender: "User", text: message }],
    });

    await newTicket.save();
    res.status(201).json({ success: true, ticket: newTicket });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const tickets = await Ticket.find({ user: decoded.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch all tickets" });
  }
};

exports.addMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { text, sender } = req.body;

    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    if (ticket.status === "Closed")
      return res
        .status(400)
        .json({ success: false, message: "Chat has ended." });

    ticket.messages.push({ sender, text });
    await ticket.save();
    res.status(200).json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

exports.closeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findOneAndUpdate(
      { ticketId },
      { status: "Closed" },
      { new: true },
    );
    res.status(200).json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to close ticket" });
  }
};
