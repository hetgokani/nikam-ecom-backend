const express = require("express");
const router = express.Router();

const controller = require("../controllers/productController");
const upload = require("../middleware/upload");

// EXCEL ROUTES MUST BE ABOVE /:id ROUTES
router.get("/export-excel", controller.exportProductsToExcel);
router.post("/import-excel", upload.any(), controller.importProductsFromExcel);

// YOUR ORIGINAL ROUTES
router.post("/create", upload.any(), controller.createProduct);
router.get("/", controller.getProducts);
router.get("/:id", controller.getProductById);
router.put("/update/:id", upload.any(), controller.updateProduct);
router.delete("/delete/:id", controller.deleteProduct);

module.exports = router;
