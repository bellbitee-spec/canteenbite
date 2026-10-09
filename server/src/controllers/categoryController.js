const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");

const formatCategory = (cat) => ({
  id: cat._id,
  name: cat.name,
  description: cat.description || "",
  image: cat.image || "",
  sortOrder: cat.sortOrder,
  isActive: cat.isActive,
  createdAt: cat.createdAt,
  updatedAt: cat.updatedAt,
});

const getCategories = async (req, res) => {
  try {
    const { includeInactive, includeUnavailable, all } = req.query;
    const filter = {};
    if (includeInactive !== "true" && includeUnavailable !== "true" && all !== "true") {
      filter.isActive = true;
    }

    const categories = await Category.find(filter).sort({
      sortOrder: 1,
      name: 1,
    });

    return res.status(200).json({
      success: true,
      data: {
        categories: categories.map(formatCategory),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching categories",
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        category: formatCategory(category),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching category details",
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description, image, sortOrder } = req.body;

    const trimmedName = name.trim();

    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const category = await Category.create({
      name: trimmedName,
      description: description ? description.trim() : "",
      image: image || "",
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        category: formatCategory(category),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating category",
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const { name, description, image, sortOrder, isActive } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      const duplicate = await Category.findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Category with this name already exists",
        });
      }

      category.name = trimmedName;
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    if (image !== undefined) {
      category.image = image;
    }

    if (sortOrder !== undefined) {
      category.sortOrder = Number(sortOrder);
    }

    if (isActive !== undefined) {
      category.isActive = Boolean(isActive);
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        category: formatCategory(category),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating category",
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const productsCount = await Product.countDocuments({ category: id });

    if (productsCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category while products are assigned to it.",
      });
    }

    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting category",
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
