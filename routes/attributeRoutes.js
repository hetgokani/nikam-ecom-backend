const express = require("express");
const router = express.Router();
const controller = require("../controllers/attributeController");

// Import the same multer upload middleware you use for products
const upload = require("../middleware/upload");

// Added upload.any() here so the backend accepts images!
router.post("/create", upload.any(), controller.createAttribute);

// ADDED: The put route to handle the edit
router.put("/:id", upload.any(), controller.updateAttribute);

router.get("/", controller.getAttributes);
router.delete("/:id", controller.deleteAttribute);

module.exports = router;
