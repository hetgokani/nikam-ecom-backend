const router = require("express").Router();
const controller = require("../controllers/brandController");

router.post("/create", controller.createBrand);
router.get("/", controller.getBrands);
// NEW: Edit & Delete routes
router.put("/:id", controller.updateBrand);
router.delete("/:id", controller.deleteBrand);

module.exports = router;
