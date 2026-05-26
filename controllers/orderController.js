const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Shipping = require("../models/Shipping");
const Variant = require("../models/Variant");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const RazorpaySetting = require("../models/RazorpaySetting");
const { decrypt } = require("../utils/encryption");

// 1. INIT RAZORPAY - CORRECTED
exports.initRazorpayOrder = async (req, res) => {
  try {
    const { shippingAddress, totalAmount } = req.body;

    // CHANGED: Searching by city instead of zip code
    const shippingConfig = await Shipping.findOne({
      city: { $regex: new RegExp(`^${shippingAddress.city.trim()}$`, "i") },
      isAvailable: true,
    });

    if (!shippingConfig)
      return res
        .status(400)
        .json({ message: "Shipping unavailable to this city" });

    // FIX: Ensure 'settings' is fetched to get the keyId
    const settings = await RazorpaySetting.findOne();
    if (!settings)
      return res.status(400).json({ message: "Razorpay not configured" });

    const secret = decrypt({
      iv: settings.iv,
      encryptedData: settings.keySecret,
    });

    const razorpay = new Razorpay({
      key_id: settings.keyId,
      key_secret: secret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `RCPT_${Date.now()}`,
    });

    // Send the keyId here so the frontend can use it
    res.status(200).json({
      success: true,
      razorpayOrder: order,
      keyId: settings.keyId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. CREATE ORDER (The "Source of Truth" for Prices)
exports.createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      billingAddress,
      subtotal,
      discountAmount,
      couponCodeApplied,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    // Verify Payment
    const settings = await RazorpaySetting.findOne();
    const secret = decrypt({
      iv: settings.iv,
      encryptedData: settings.keySecret,
    });
    const expected = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
    if (expected !== razorpay_signature)
      return res.status(400).json({ message: "Verification failed" });

    // Final Pricing Logic: Uses DISCOUNT PRICE
    const verifiedOrderItems = orderItems.map((item) => ({
      product: item.product,
      variant: item.variant,
      title: item.title,
      quantity: item.quantity,
      price: Number(item.price), // USE THE PRICE SENT FROM FRONTEND
      image: item.image,
    }));

    // Now the subtotal will be correct
    const finalSubtotal = verifiedOrderItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    // FIX: Search by City (case-insensitive) just like the frontend!
    const shippingConfig = await Shipping.findOne({
      city: { $regex: new RegExp(`^${shippingAddress.city.trim()}$`, "i") },
    });

    // Fallback to 0 if something goes wrong, instead of crashing
    const actualShippingPrice = shippingConfig
      ? shippingConfig.shippingPrice
      : 0;

    const totalPrice = finalSubtotal + actualShippingPrice - discountAmount;

    const order = new Order({
      user: req.user.id,
      orderNumber: `#NO-${new Date().getFullYear()}-${String(
        (await Order.countDocuments()) + 1,
      ).padStart(3, "0")}`,
      orderItems: verifiedOrderItems,
      shippingAddress,
      billingAddress,
      paymentInfo: {
        method: "Razorpay",
        transactionId: razorpay_payment_id,
        status: "Completed",
      },
      subtotal: finalSubtotal,
      shippingPrice: actualShippingPrice,
      discountAmount,
      totalPrice,
      couponCodeApplied,
    });

    await order.save();
    await Promise.all(
      orderItems.map((i) =>
        Variant.findByIdAndUpdate(i.variant, { $inc: { stock: -i.quantity } }),
      ),
    );
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

    res.status(201).json({ success: true, order });
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
// ULTRA-PROFESSIONAL INVOICE GENERATOR
// =====================================================================
exports.downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email",
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const doc = new PDFDocument({
      margins: { top: 40, bottom: 15, left: 40, right: 40 },
      size: "A4",
      bufferPages: true,
    });
    const invoiceNumber = order.orderNumber.replace("#SW", "INV");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoiceNumber}.pdf`,
    );
    doc.pipe(res);

    // --- 1. HEADER & LOGO ---
    const logoPath = path.join(__dirname, "../logo.png");

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 150 });
    } else {
      doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .fillColor("#407e18")
        .text("Nikam Organic", 40, 30);
    }

    // Title
    doc
      .fillColor("#000000")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("INVOICE", 200, 35, { align: "right" })
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#64748b")
      .text("Original for Recipient", { align: "right" });

    // Divider
    doc.moveTo(40, 90).lineTo(555, 90).strokeColor("#e2e8f0").stroke();

    let currentY = 105;

    // --- 2. SELLER & ORDER INFO ---
    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Sold By:", 40, currentY);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#333333")
      .text("Nikam Organic", 40, currentY + 15)
      .text("02-b unnati nagar pole", 40, currentY + 30)
      .text("no.17 deopur dhule, dhule deopur,", 40, currentY + 45)
      .text("Dhule - 424002, Maharashtra", 40, currentY + 60)
      .font("Helvetica-Bold");

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
        currentY + 15,
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
    // Safely building the strings (Removed .zip references if they existed in text blocks)
    let billAddr = `${order.billingAddress.firstName} ${order.billingAddress.lastName}\n${order.billingAddress.address1}\n`;
    if (order.billingAddress.address2)
      billAddr += `${order.billingAddress.address2}\n`;
    billAddr += `${order.billingAddress.city}\n${order.billingAddress.country}\nPh: ${order.billingAddress.phone}`;

    let shipAddr = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}\n${order.shippingAddress.address1}\n`;
    if (order.shippingAddress.address2)
      shipAddr += `${order.shippingAddress.address2}\n`;
    shipAddr += `${order.shippingAddress.city}\n${order.shippingAddress.country}\nPh: ${order.shippingAddress.phone}`;

    // Left Side: Billing
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

    // Right Side: Shipping
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
    // --- 5. THE PROFESSIONAL TOTALS BOX (NO GST) ---
    const subtotalNumber = Number(order.subtotal);

    // Box height set to 85 to fit the 3 lines neatly
    doc.rect(320, currentY, 235, 85).strokeColor("#e2e8f0").stroke();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      // 1. Total Amount (Label & Price)
      .text("Total Amount:", 330, currentY + 12, { width: 100 })
      .fillColor("#000000")
      .text(`Rs. ${subtotalNumber.toFixed(2)}`, 440, currentY + 12, {
        width: 105,
        align: "right",
      })
      // 2. Shipping Charges (Label & Price)
      .fillColor("#64748b")
      .text("Shipping Charges:", 330, currentY + 27, { width: 100 })
      .fillColor("#000000")
      .text(
        `Rs. ${Number(order.shippingPrice).toFixed(2)}`,
        440,
        currentY + 27, // FIXED: Matches label's Y-position perfectly
        { width: 105, align: "right" },
      );

    let nextY = currentY + 42;

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

    // Divider Line
    doc
      .moveTo(320, nextY + 5)
      .lineTo(555, nextY + 5)
      .strokeColor("#e2e8f0")
      .stroke();

    // 3. Grand Total
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#000000")
      .text("Grand Total:", 330, nextY + 15, { width: 100 })
      .fillColor("#407e18")
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
        currentY + 40,
      );
    }

    // --- Authorised Signatory ---
    const authY = Math.max(nextY + 60, currentY + 160);
    if (authY > 750) doc.addPage();

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#000000")
      .text("From Nikam Organic", 350, authY, { align: "right", width: 200 });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      .text("Thank You", 350, authY + 45, {
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
          "This is a computer-generated invoice and does not require a physical signature.",
          40,
          805,
          { align: "center", width: 515 },
        );
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getNewOrderCount = async (req, res) => {
  try {
    // Queries your Order model for all 'Pending' orders
    const count = await Order.countDocuments({ orderStatus: "Pending" });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error counting orders" });
  }
};
