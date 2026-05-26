const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middleware/auth");
// Ensure you have an admin middleware, e.g., const adminMiddleware = require("../middleware/admin");

router.use(authMiddleware);

// User Routes
router.post("/", orderController.createOrder);
router.get("/myorders", orderController.getMyOrders);
router.post("/init-payment", orderController.initRazorpayOrder);
// Admin Routes (Add adminMiddleware in production)
router.get("/admin/all", orderController.getAllOrdersAdmin);
router.put("/admin/:id/status", orderController.updateOrderStatus);
router.get("/:id/invoice", orderController.downloadInvoice);
router.get("/new-count", orderController.getNewOrderCount);
module.exports = router;
