const Coupon = require("../models/Coupon");
const Product = require("../models/Product"); // <-- ADDED: We need this to verify categories securely

// 1. CREATE COUPON
exports.createCoupon = async (req, res) => {
  try {
    // Force uppercase before saving to DB
    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. GET ALL COUPONS (Admin)
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate("selectedCategories", "title")
      .populate("selectedProducts", "title")
      .sort({ createdAt: -1 });
    res.status(200).json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. UPDATE COUPON
exports.updateCoupon = async (req, res) => {
  try {
    // Force uppercase before updating DB
    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }
    const updated = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. VALIDATE/APPLY COUPON (For Checkout)
exports.validateCoupon = async (req, res) => {
  try {
    let { code, cartItems, subtotal } = req.body;

    // Force uppercase before searching the DB
    if (code) {
      code = code.toUpperCase();
    }

    const coupon = await Coupon.findOne({ code, status: "Active" });

    if (!coupon) {
      return res
        .status(404)
        .json({ message: "Invalid or inactive coupon code." });
    }

    // Check Expiry
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({ message: "This coupon has expired." });
    }

    // Check Min Order Amount
    if (subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order of ₹${coupon.minOrderAmount} required.`,
      });
    }

    // Convert MongoDB ObjectIds to strings for accurate JS comparison
    const targetProducts = coupon.selectedProducts.map((id) => id.toString());
    const targetCategories = coupon.selectedCategories.map((id) =>
      id.toString()
    );

    // --- SECURE BACKEND CATEGORY CHECK ---
    // Fetch the actual products from the DB to guarantee we know their true Category
    const productIds = cartItems.map((item) => item.productId).filter(Boolean);
    const dbProducts = await Product.find({ _id: { $in: productIds } });

    // Create a map of productId -> categoryId for instant lookup
    const categoryMap = {};
    dbProducts.forEach((prod) => {
      categoryMap[prod._id.toString()] = prod.category
        ? prod.category.toString()
        : null;
    });
    // --------------------------------------

    // Filtering logic for Specific Products/Categories
    let eligibleAmount = 0;

    if (coupon.applyTo === "All Products") {
      eligibleAmount = subtotal;
    } else {
      cartItems.forEach((item) => {
        const pIdStr = item.productId ? item.productId.toString() : "";

        // RELIABLY fetch the category from the database map we just created
        const actualCategoryIdStr = categoryMap[pIdStr] || "";

        const isProductMatch = targetProducts.includes(pIdStr);
        const isCategoryMatch = targetCategories.includes(actualCategoryIdStr);

        if (coupon.applyTo === "Specific Products" && isProductMatch) {
          eligibleAmount += item.price * item.quantity;
        } else if (
          coupon.applyTo === "Specific Categories" &&
          isCategoryMatch
        ) {
          eligibleAmount += item.price * item.quantity;
        }
      });
    }

    if (eligibleAmount <= 0) {
      return res.status(400).json({
        message: "No eligible products found in cart for this coupon.",
      });
    }

    // Calculate Discount
    let discount = 0;
    if (coupon.discountType === "Percentage") {
      discount = (eligibleAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discountValue;
      // Prevent fixed discounts from exceeding the eligible amount
      if (discount > eligibleAmount) {
        discount = eligibleAmount;
      }
    }

    res.status(200).json({
      success: true,
      discount: Math.round(discount),
      couponCode: coupon.code,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. DELETE COUPON
exports.deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
