const Review = require("../models/Review");
const Variant = require("../models/Variant");

// --- 1. PUBLIC: Add a Review ---
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const variantId = req.params.variantId;
    const userId = req.user.id || req.user._id;

    const variantExists = await Variant.findById(variantId);
    if (!variantExists) {
      return res.status(404).json({ message: "Variant not found" });
    }

    const alreadyReviewed = await Review.findOne({
      user: userId,
      variant: variantId,
    });

    if (alreadyReviewed) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this variant" });
    }

    // Creates review with default status "Pending"
    const review = await Review.create({
      user: userId,
      variant: variantId,
      rating: Number(rating),
      comment: comment,
    });

    res.status(201).json({
      success: true,
      message: "Review submitted for approval",
      review,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 2. PUBLIC: Get Approved Reviews for a Product Page ---
exports.getVariantReviews = async (req, res) => {
  try {
    const variantId = req.params.variantId;

    // IMPORTANT: Only fetch reviews where status is "Approved"
    const reviews = await Review.find({
      variant: variantId,
      status: "Approved",
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    let averageRating = 0;
    let ratingStats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, item) => {
        if (ratingStats[item.rating] !== undefined) {
          ratingStats[item.rating]++;
        }
        return acc + item.rating;
      }, 0);
      averageRating = Number((sum / reviews.length).toFixed(1));
    }

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating,
      ratingStats,
      reviews,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 3. ADMIN: Get ALL Reviews (Pending, Approved, Rejected) ---
exports.getAllReviewsForAdmin = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "name email")
      .populate({
        path: "variant",
        populate: {
          path: "productId",
          select: "title thumbnail",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 4. ADMIN: Update Review Status (Approve/Reject) ---
exports.updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.status(200).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 5. ADMIN: Delete a Review ---
exports.deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
