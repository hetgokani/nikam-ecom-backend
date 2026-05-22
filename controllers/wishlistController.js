const Wishlist = require("../models/Wishlist");

// Get user's wishlist
exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate("items.product", "title thumbnail price")
      .populate("items.variant");

    if (!wishlist) {
      return res.status(200).json({ items: [] });
    }
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { productId, variantId } = req.body;

    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user.id,
        items: [{ product: productId, variant: variantId || null }],
      });
      return res.status(201).json({ status: "success", wishlist });
    }

    // Check if item already exists
    const itemExists = wishlist.items.some(
      (item) =>
        item.product.toString() === productId &&
        (item.variant ? item.variant.toString() === variantId : true),
    );

    if (itemExists) {
      return res.status(400).json({ message: "Item is already in wishlist" });
    }

    wishlist.items.push({ product: productId, variant: variantId || null });
    await wishlist.save();

    res.status(200).json({ status: "success", wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { itemId } = req.params; // _id of the item in the array
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { items: { _id: itemId } } },
      { new: true },
    );
    res.status(200).json({ status: "success", wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
