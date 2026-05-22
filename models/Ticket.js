const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["User", "Admin"], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true }, // e.g., SW-0001
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["Account", "Order", "Payment", "Product", "Query"],
      required: true,
    },
    status: { type: String, enum: ["Open", "Closed"], default: "Open" },
    messages: [messageSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ticket", ticketSchema);
