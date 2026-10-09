const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Product = require("../models/Product");
const Category = require("../models/Category");
const env = require("../config/env");

const formatProduct = (prod) => {
  let categoryData = null;

  if (prod.category) {
    if (prod.category.name !== undefined) {
      categoryData = {
        id: prod.category._id,
        name: prod.category.name,
      };
    } else {
      categoryData = {
        id: prod.category,
      };
    }
  }

  return {
    id: prod._id,
    name: prod.name,
    slug: prod.slug,
    description: prod.description || "",
    image: prod.image || "",
    category: categoryData,
    price: prod.price,
    stock: prod.stock,
    lowStockThreshold: prod.lowStockThreshold,
    isAvailable: prod.isAvailable,
    preparationTime: prod.preparationTime,
    sortOrder: prod.sortOrder,
    createdAt: prod.createdAt,
    updatedAt: prod.updatedAt,
  };
};

const checkAdminAccess = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) return false;

    const secret = env.JWT_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    return Boolean(
      decoded && (decoded.role === "ADMIN" || decoded.role === "SUPER_ADMIN")
    );
  } catch (error) {
    return false;
  }
};

const getProducts = async (req, res) => {
  try {
    const { category, search, available, includeUnavailable } = req.query;
    const filter = {};

    if (includeUnavailable === "true") {
      const isAdmin = checkAdminAccess(req);
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin authorization required to view unavailable products",
        });
      }
    } else {
      filter.isAvailable = true;
    }

    if (available !== undefined) {
      if (available === "true") {
        filter.isAvailable = true;
      } else if (available === "false") {
        const isAdmin = checkAdminAccess(req);
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: "Admin authorization required to view unavailable products",
          });
        }
        filter.isAvailable = false;
      }
    }

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID format",
        });
      }
      filter.category = category;
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      const cleanSearch = search.trim();
      filter.$or = [
        { name: { $regex: cleanSearch, $options: "i" } },
        { description: { $regex: cleanSearch, $options: "i" } },
      ];
    }

    const products = await Product.find(filter)
      .populate("category", "name")
      .sort({ sortOrder: 1, name: 1 });

    return res.status(200).json({
      success: true,
      data: {
        products: products.map(formatProduct),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching products",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await Product.findById(id).populate("category", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        product: formatProduct(product),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching product details",
    });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const products = await Product.find({
      category: categoryId,
      isAvailable: true,
    })
      .populate("category", "name")
      .sort({ sortOrder: 1, name: 1 });

    return res.status(200).json({
      success: true,
      data: {
        products: products.map(formatProduct),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching products by category",
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      image,
      category,
      price,
      stock,
      lowStockThreshold,
      preparationTime,
      sortOrder,
    } = req.body;

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const cleanSlug = slug.toLowerCase().trim();
    const existingSlug = await Product.findOne({ slug: cleanSlug });
    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "Product with this slug already exists",
      });
    }

    const product = await Product.create({
      name: name.trim(),
      slug: cleanSlug,
      description: description ? description.trim() : "",
      image: image || "",
      category,
      price: Number(price),
      stock: Number(stock),
      lowStockThreshold:
        lowStockThreshold !== undefined ? Number(lowStockThreshold) : 5,
      preparationTime:
        preparationTime !== undefined ? Number(preparationTime) : 10,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isAvailable: true,
    });

    const populatedProduct = await Product.findById(product._id).populate(
      "category",
      "name"
    );

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: {
        product: formatProduct(populatedProduct),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating product",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const {
      name,
      slug,
      description,
      image,
      category,
      price,
      stock,
      lowStockThreshold,
      preparationTime,
      isAvailable,
      sortOrder,
    } = req.body;

    if (category !== undefined) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
      product.category = category;
    }

    if (slug !== undefined) {
      const cleanSlug = slug.toLowerCase().trim();
      const duplicateSlug = await Product.findOne({
        slug: cleanSlug,
        _id: { $ne: id },
      });

      if (duplicateSlug) {
        return res.status(409).json({
          success: false,
          message: "Product with this slug already exists",
        });
      }
      product.slug = cleanSlug;
    }

    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (image !== undefined) product.image = image;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (lowStockThreshold !== undefined)
      product.lowStockThreshold = Number(lowStockThreshold);
    if (preparationTime !== undefined)
      product.preparationTime = Number(preparationTime);
    if (isAvailable !== undefined) product.isAvailable = Boolean(isAvailable);
    if (sortOrder !== undefined) product.sortOrder = Number(sortOrder);

    await product.save();

    const populatedProduct = await Product.findById(product._id).populate(
      "category",
      "name"
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: {
        product: formatProduct(populatedProduct),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating product",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isAvailable = false;
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product disabled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting product",
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
};
