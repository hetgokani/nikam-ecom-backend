const express = require("express");
const router = express.Router();
const controller = require("../controllers/stockController");
const multer = require("multer");

// Use memory storage for Excel files to process them directly
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/all", controller.getAllStock);
router.get("/export", controller.exportStockToExcel);
router.post("/import", upload.any(), controller.importStockFromExcel);

module.exports = router;
