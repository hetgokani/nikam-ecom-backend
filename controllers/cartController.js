const Cart = require("../models/Cart");

// Get user's cart
// Get user's cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      // FIX: Added discountPrice and stock to the populate array
      .populate("items.product", "title thumbnail price discountPrice stock")
      .populate("items.variant");

    if (!cart) {
      return res.status(200).json({ items: [] });
    }
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const qty = Number(quantity) || 1;

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [
          { product: productId, variant: variantId || null, quantity: qty },
        ],
      });
      return res.status(201).json({ status: "success", cart });
    }

    // FIX: Strictly compare variants. If one has a variant and the other doesn't, they are NOT the same item.
    const itemIndex = cart.items.findIndex((item) => {
      const isSameProduct = item.product.toString() === productId;
      const isSameVariant = item.variant
        ? item.variant.toString() === variantId
        : variantId == null || variantId === "";

      return isSameProduct && isSameVariant;
    });

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
    } else {
      cart.items.push({
        product: productId,
        variant: variantId || null,
        quantity: qty,
      });
    }

    await cart.save();
    res.status(200).json({ status: "success", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update item quantity
exports.updateQuantity = async (req, res) => {
  try {
    const { itemId } = req.params; // This is the _id of the item inside the items array
    const { action } = req.body; // "increment" or "decrement"

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId,
    );
    if (itemIndex === -1)
      return res.status(404).json({ message: "Item not found in cart" });

    if (action === "increment") {
      cart.items[itemIndex].quantity += 1;
    } else if (action === "decrement") {
      cart.items[itemIndex].quantity -= 1;
      // Remove item if quantity drops to 0
      if (cart.items[itemIndex].quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      }
    }

    await cart.save();
    res.status(200).json({ status: "success", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove single item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { items: { _id: itemId } } },
      { new: true },
    );
    res.status(200).json({ status: "success", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear entire cart
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [] },
      { new: true },
    );
    res.status(200).json({ status: "success", message: "Cart cleared", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
