const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

dotenv.config();

// Existing Routes
const userRoutes = require("./routes/userRoutes");
const roleRoutes = require("./routes/roleroutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const contactroutes = require("./routes/contactroutes");
const faqRoutes = require("./routes/faqroutes");
const emailSettingRoutes = require("./routes/emailSettingRoutes");
// NEW ROUTES
const attributeRoutes = require("./routes/attributeRoutes");
const brandRoutes = require("./routes/brandRoutes");
const stockRoutes = require("./routes/stockRoutes");
const gstRoutes = require("./routes/gstRoutes");
const tagRoutes = require("./routes/tagRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const couponRoutes = require("./routes/couponRoutes");
const orderRoutes = require("./routes/orderRoutes");
const shippingRoutes = require("./routes/shippingRoutes");
const chatRoutes = require("./routes/chatRoutes");
const paymentSettingRoutes = require("./routes/paymentSettingRoutes");
const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Serve static images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/user", userRoutes);
app.use("/api/role", roleRoutes);
app.use("/api/products", productRoutes);
app.use("/api/category", categoryRoutes);

// NEW ROUTES REGISTER
app.use("/api/attributes", attributeRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/gst", gstRoutes);
app.use("/api/tags", tagRoutes); // NEW TAG ROUTE REGISTERED
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactroutes);
app.use("/api/faq", faqRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/settings/email", emailSettingRoutes);
app.use("/api/settings/payment", paymentSettingRoutes);

// --- HEALTH CHECK API ---
app.get("/health", (req, res) => {
  console.log("Health check API hit by frontend loader");
  res.status(200).json({
    status: "success",
    message: "Server is checking and running perfectly!",
  });
});
// Database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
