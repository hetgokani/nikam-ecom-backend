const Category = require("../models/Category");

// @desc    Create a new category
// @route   POST /api/categories/add
const createCategory = async (req, res) => {
  try {
    const { title, order, subcategories } = req.body;

    const newCategory = new Category({
      title,
      order,
      subcategories, // Expects array of objects: [{ title: 'Sub1' }, { title: 'Sub2' }]
    });

    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating category", error: error.message });
  }
};

// @desc    Get all categories
// @route   GET /api/categories/all
const getCategories = async (req, res) => {
  try {
    // Sorts by 'order' so they appear in the correct sequence
    const categories = await Category.find().sort({ order: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching categories", error: error.message });
  }
};

// @desc    Update a category by ID
// @route   PUT /api/categories/update/:id
const updateCategory = async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, // Updates whatever fields are sent (title, order, or subcategories)
      { new: true }, // Returns the updated document instead of the old one
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(updatedCategory);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating category", error: error.message });
  }
};

// @desc    Delete a category by ID
// @route   DELETE /api/categories/delete/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting category", error: error.message });
  }
};

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
