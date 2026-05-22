const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Shipping = require("../models/Shipping");
const Variant = require("../models/Variant"); // REQUIRED to update stock
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
exports.createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      billingAddress,
      subtotal,
      discountAmount,
      couponCodeApplied,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    // =========================================================
    // 1. NEW: VALIDATE STOCK BEFORE PLACING ORDER
    // =========================================================
    for (const item of orderItems) {
      const variantData = await Variant.findById(item.variant);
      if (!variantData) {
        return res
          .status(404)
          .json({ message: `Variant not found for ${item.title}` });
      }
      if (variantData.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.title}. Only ${variantData.stock} left.`,
        });
      }
    }

    // ----- VALIDATE SHIPPING & GET DYNAMIC PRICE -----
    const shippingConfig = await Shipping.findOne({
      pincode: shippingAddress.zip,
      isAvailable: true,
    });

    if (!shippingConfig) {
      return res.status(400).json({
        message: `Shipping is currently not available for PIN Code: ${shippingAddress.zip}`,
      });
    }

    const calculatedShippingPrice = shippingConfig.shippingPrice;
    const finalTotalPrice = subtotal + calculatedShippingPrice - discountAmount;
    // ------------------------------------------------------

    const currentYear = new Date().getFullYear();
    const orderCount = await Order.countDocuments();
    const orderNumber = `#SW-${currentYear}-${String(orderCount + 1).padStart(
      3,
      "0"
    )}`;
    const transactionId = `COD-TXN-${Date.now()}`;

    const order = new Order({
      user: req.user.id,
      orderNumber,
      orderItems,
      shippingAddress,
      billingAddress,
      paymentInfo: {
        method: "COD",
        transactionId: transactionId,
        status: "Pending",
      },
      subtotal,
      shippingPrice: calculatedShippingPrice,
      discountAmount,
      totalPrice: finalTotalPrice,
      couponCodeApplied,
    });

    const createdOrder = await order.save();

    // =========================================================
    // 2. NEW: MINUS THE STOCK AS PER THE ORDER QUANTITY
    // =========================================================
    const stockUpdates = orderItems.map((item) => {
      return Variant.findByIdAndUpdate(item.variant, {
        $inc: { stock: -item.quantity },
      });
    });

    await Promise.all(stockUpdates);
    // =========================================================

    // Clear the cart
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

    res.status(201).json({
      success: true,
      order: createdOrder,
      message: "Order placed successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user's order history
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= ADMIN ROUTES =================

// @desc    Get ALL orders for Admin Dashboard
exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "id name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Order Status (Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.orderStatus = status;
    if (status === "Delivered") {
      order.paymentInfo.status = "Completed";
    }

    await order.save();
    res
      .status(200)
      .json({ success: true, order, message: "Order status updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// =====================================================================
// NEW: ULTRA-PROFESSIONAL INVOICE GENERATOR
// =====================================================================
exports.downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // FIX: Changed 'margin: 40' to explicit margins with 'bottom: 15'.
    // This perfectly solves the blank 2nd page issue!
    const doc = new PDFDocument({
      margins: { top: 40, bottom: 15, left: 40, right: 40 },
      size: "A4",
      bufferPages: true,
    });
    const invoiceNumber = order.orderNumber.replace("#SW", "INV");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoiceNumber}.pdf`
    );
    doc.pipe(res);

    // --- 1. HEADER & LOGO ---
    const logoPath = path.join(__dirname, "../swlogo.png");

    // Check if the PNG logo exists. (MUST BE PNG, NOT WEBP!)
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 150 });
    } else {
      doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .fillColor("#de433f")
        .text("SneakersWala", 40, 30);
    }

    // Title
    doc
      .fillColor("#000000")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("TAX INVOICE", 200, 35, { align: "right" })
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#64748b")
      .text("Original for Recipient", { align: "right" });

    // Divider
    doc.moveTo(40, 90).lineTo(555, 90).strokeColor("#e2e8f0").stroke();

    let currentY = 105;

    // --- 2. SELLER & ORDER INFO ---
    // Seller Box
    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Sold By:", 40, currentY);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#333333")
      .text("SneakersWala Official Store", 40, currentY + 15)
      .text("150 Feet Ring Road, Rajkot", 40, currentY + 30)
      .text("Gujarat, 360005, India", 40, currentY + 45)
      .font("Helvetica-Bold")
      .text("GSTIN: 24AAAAA0000A1Z5", 40, currentY + 65);

    // Order Box
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#000000")
      .text("Order Number:", 320, currentY)
      .font("Helvetica")
      .fillColor("#333333")
      .text(order.orderNumber, 410, currentY)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Order Date:", 320, currentY + 15)
      .font("Helvetica")
      .fillColor("#333333")
      .text(
        new Date(order.createdAt).toLocaleDateString("en-IN"),
        410,
        currentY + 15
      )
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Invoice Number:", 320, currentY + 35)
      .font("Helvetica")
      .fillColor("#333333")
      .text(invoiceNumber, 410, currentY + 35)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Invoice Date:", 320, currentY + 50)
      .font("Helvetica")
      .fillColor("#333333")
      .text(new Date().toLocaleDateString("en-IN"), 410, currentY + 50);

    currentY = 195;
    doc
      .moveTo(40, currentY)
      .lineTo(555, currentY)
      .strokeColor("#e2e8f0")
      .stroke();
    currentY += 15;

    // --- 3. DYNAMIC ADDRESS BOXES ---
    // Safely building the strings
    let billAddr = `${order.billingAddress.firstName} ${order.billingAddress.lastName}\n${order.billingAddress.address1}\n`;
    if (order.billingAddress.address2)
      billAddr += `${order.billingAddress.address2}\n`;
    billAddr += `${order.billingAddress.city}, ${order.billingAddress.zip}\n${order.billingAddress.country}\nPh: ${order.billingAddress.phone}`;

    let shipAddr = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}\n${order.shippingAddress.address1}\n`;
    if (order.shippingAddress.address2)
      shipAddr += `${order.shippingAddress.address2}\n`;
    shipAddr += `${order.shippingAddress.city}, ${order.shippingAddress.zip}\n${order.shippingAddress.country}\nPh: ${order.shippingAddress.phone}`;

    // Left Side: Billing (Width restricted to 230 so it wraps down, never across)
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#000000")
      .text("Billing Address:", 40, currentY);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#333333")
      .text(billAddr, 40, currentY + 15, {
        width: 230,
        align: "left",
        lineGap: 2,
      });

    // Right Side: Shipping (Width restricted to 230 so it wraps down)
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#000000")
      .text("Shipping Address:", 320, currentY);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#333333")
      .text(shipAddr, 320, currentY + 15, {
        width: 230,
        align: "left",
        lineGap: 2,
      });

    // Automatically calculate where the next section should start based on address length!
    currentY = Math.max(doc.y, currentY + 80) + 25;

    // --- 4. ITEMS TABLE ENGINE ---
    const drawTableHeader = (y) => {
      doc.rect(40, y, 515, 25).fillAndStroke("#f8fafc", "#e2e8f0");
      doc
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Sl.", 50, y + 8)
        .text("Product Description", 80, y + 8)
        .text("Unit Price", 300, y + 8, { width: 60, align: "right" })
        .text("Qty", 370, y + 8, { width: 30, align: "right" })
        .text("Net Amount", 410, y + 8, { width: 60, align: "right" })
        .text("Total", 480, y + 8, { width: 65, align: "right" });
      return y + 25;
    };

    currentY = drawTableHeader(currentY);

    order.orderItems.forEach((item, index) => {
      // NEW PAGE TRIGGER: If we reach the bottom, create a new page! No blank pages!
      if (currentY > 700) {
        doc.addPage();
        currentY = 40;
        currentY = drawTableHeader(currentY);
      }

      const itemTotal = item.price * item.quantity;
      const titleHeight = doc.heightOfString(item.title, {
        width: 210,
        fontSize: 9,
      });
      const rowHeight = Math.max(25, titleHeight + 10);

      doc.rect(40, currentY, 515, rowHeight).strokeColor("#e2e8f0").stroke();

      doc
        .fillColor("#333333")
        .font("Helvetica")
        .fontSize(9)
        .text((index + 1).toString(), 50, currentY + 8)
        .text(item.title, 80, currentY + 8, { width: 210 })
        .text(`Rs. ${item.price.toFixed(2)}`, 300, currentY + 8, {
          width: 60,
          align: "right",
        })
        .text(item.quantity.toString(), 370, currentY + 8, {
          width: 30,
          align: "right",
        })
        .text(`Rs. ${itemTotal.toFixed(2)}`, 410, currentY + 8, {
          width: 60,
          align: "right",
        })
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(`Rs. ${itemTotal.toFixed(2)}`, 480, currentY + 8, {
          width: 65,
          align: "right",
        });

      currentY += rowHeight;
    });

    if (currentY > 580) {
      doc.addPage();
      currentY = 40;
    } else {
      currentY += 20;
    }

    // --- 5. THE GST MATH & PROFESSIONAL TOTALS BOX ---
    // We reverse calculate standard 18% GST from the Subtotal
    const subtotalNumber = Number(order.subtotal);
    const taxableValue = subtotalNumber / 1.18;
    const cgst = taxableValue * 0.09;
    const sgst = taxableValue * 0.09;

    doc.rect(320, currentY, 235, 125).strokeColor("#e2e8f0").stroke();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      .text("Taxable Value:", 330, currentY + 12, { width: 100 })
      .fillColor("#000000")
      .text(`Rs. ${taxableValue.toFixed(2)}`, 440, currentY + 12, {
        width: 105,
        align: "right",
      })

      .fillColor("#64748b")
      .text("CGST (9%):", 330, currentY + 27, { width: 100 })
      .fillColor("#000000")
      .text(`Rs. ${cgst.toFixed(2)}`, 440, currentY + 27, {
        width: 105,
        align: "right",
      })

      .fillColor("#64748b")
      .text("SGST (9%):", 330, currentY + 42, { width: 100 })
      .fillColor("#000000")
      .text(`Rs. ${sgst.toFixed(2)}`, 440, currentY + 42, {
        width: 105,
        align: "right",
      })

      .fillColor("#64748b")
      .text("Shipping Charges:", 330, currentY + 57, { width: 100 })
      .fillColor("#000000")
      .text(
        `Rs. ${Number(order.shippingPrice).toFixed(2)}`,
        440,
        currentY + 57,
        { width: 105, align: "right" }
      );

    let nextY = currentY + 72;

    if (order.discountAmount > 0) {
      doc
        .fillColor("#16a34a")
        .text("Discount Applied:", 330, nextY, { width: 100 })
        .text(`- Rs. ${Number(order.discountAmount).toFixed(2)}`, 440, nextY, {
          width: 105,
          align: "right",
        });
      nextY += 15;
    }

    doc
      .moveTo(320, nextY + 5)
      .lineTo(555, nextY + 5)
      .strokeColor("#e2e8f0")
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#000000")
      .text("Grand Total:", 330, nextY + 15, { width: 100 })
      .fillColor("#de433f")
      .text(`Rs. ${Number(order.totalPrice).toFixed(2)}`, 420, nextY + 15, {
        width: 125,
        align: "right",
      });

    // --- Payment Details ---
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#000000")
      .text("Payment Details:", 40, currentY + 10);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#333333")
      .text(`Mode of Payment: ${order.paymentInfo.method}`, 40, currentY + 25);

    if (order.paymentInfo.transactionId) {
      doc.text(
        `Transaction ID: ${order.paymentInfo.transactionId}`,
        40,
        currentY + 40
      );
    }

    // --- Authorised Signatory ---
    const authY = Math.max(nextY + 60, currentY + 160);
    if (authY > 750) doc.addPage(); // Failsafe

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#000000")
      .text("For SneakersWala:", 350, authY, { align: "right", width: 200 });
    doc
      .moveTo(400, authY + 40)
      .lineTo(550, authY + 40)
      .strokeColor("#000000")
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      .text("Authorized Signatory", 350, authY + 45, {
        align: "right",
        width: 200,
      });

    // --- 6. GLOBAL FOOTER ---
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.moveTo(40, 800).lineTo(555, 800).strokeColor("#e2e8f0").stroke();
      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor("#94a3b8")
        .text(
          "This is a computer-generated tax invoice and does not require a physical signature.",
          40,
          805,
          { align: "center", width: 515 }
        );
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
