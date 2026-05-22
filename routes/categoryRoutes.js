const express = require("express");
const router = express.Router();
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

// POST: Add a new category
router.post("/add", createCategory);

// GET: Retrieve all categories
router.get("/all", getCategories);

// PUT: Update specific category by ID
router.put("/update/:id", updateCategory);

// DELETE: Remove specific category by ID
router.delete("/delete/:id", deleteCategory);

module.exports = router;
