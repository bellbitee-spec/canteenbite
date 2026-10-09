const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Combo = require("../models/Combo");
const Product = require("../models/Product");
const env = require("../config/env");

const formatCombo = (combo) => {
  return {
    id: combo._id,
    name: combo.name,
    description: combo.description || "",
    image: combo.image || "",
    price: combo.price,
    preparationTime: combo.preparationTime,
    isAvailable: combo.isAvailable,
    sortOrder: combo.sortOrder,
    items: (combo.items || []).map((item) => {
      let prodData = null;
      if (item.product) {
        if (typeof item.product === "object" && item.product.name !== undefined) {
          prodData = {
            id: item.product._id,
            name: item.product.name,
            price: item.product.price,
            image: item.product.image || "",
          };
        } else {
          prodData = item.product;
        }
      }
      return {
        product: prodData,
        quantity: item.quantity,
      };
    }),
    createdAt: combo.createdAt,
    updatedAt: combo.updatedAt,
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

const normalizeComboItems = (items) => {
  const itemMap = new Map();
  for (const item of items) {
    const prodIdStr = item.product.toString();
    if (itemMap.has(prodIdStr)) {
      itemMap.get(prodIdStr).quantity += Number(item.quantity);
    } else {
      itemMap.set(prodIdStr, {
        product: item.product,
        quantity: Number(item.quantity),
      });
    }
  }
  return Array.from(itemMap.values());
};

const validateReferencedProducts = async (normalizedItems) => {
  const productIds = normalizedItems.map((item) => item.product);

  const products = await Product.find({ _id: { $in: productIds } });

  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p._id.toString()));
    const missingId = productIds.find((id) => !foundIds.has(id.toString()));
    return {
      status: 404,
      error: `Referenced product with ID '${missingId}' not found`,
    };
  }

  const unavailableProduct = products.find((p) => !p.isAvailable);
  if (unavailableProduct) {
    return {
      status: 400,
      error: `Product '${unavailableProduct.name}' is currently unavailable and cannot be included in a combo`,
    };
  }

  return { valid: true, products };
};

const getCombos = async (req, res) => {
  try {
    const { includeUnavailable } = req.query;
    const filter = {};

    if (includeUnavailable === "true") {
      const isAdmin = checkAdminAccess(req);
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin authorization required to view unavailable combos",
        });
      }
    } else {
      filter.isAvailable = true;
    }

    const combos = await Combo.find(filter)
      .populate("items.product", "name price image")
      .sort({ sortOrder: 1, name: 1 });

    return res.status(200).json({
      success: true,
      data: {
        combos: combos.map(formatCombo),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching combos",
    });
  }
};

const getComboById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid combo ID format",
      });
    }

    const combo = await Combo.findById(id).populate(
      "items.product",
      "name price image"
    );

    if (!combo) {
      return res.status(404).json({
        success: false,
        message: "Combo not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        combo: formatCombo(combo),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching combo details",
    });
  }
};

const createCombo = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      items,
      price,
      preparationTime,
      sortOrder,
    } = req.body;

    const normalizedItems = normalizeComboItems(items);

    const validation = await validateReferencedProducts(normalizedItems);
    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        message: validation.error,
      });
    }

    const combo = await Combo.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      image: image || "",
      items: normalizedItems,
      price: Number(price),
      preparationTime:
        preparationTime !== undefined ? Number(preparationTime) : 10,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isAvailable: true,
    });

    const populatedCombo = await Combo.findById(combo._id).populate(
      "items.product",
      "name price image"
    );

    return res.status(201).json({
      success: true,
      message: "Combo created successfully",
      data: {
        combo: formatCombo(populatedCombo),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating combo",
    });
  }
};

const updateCombo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid combo ID format",
      });
    }

    const combo = await Combo.findById(id);
    if (!combo) {
      return res.status(404).json({
        success: false,
        message: "Combo not found",
      });
    }

    const {
      name,
      description,
      image,
      items,
      price,
      preparationTime,
      sortOrder,
      isAvailable,
    } = req.body;

    if (items !== undefined) {
      const normalizedItems = normalizeComboItems(items);
      const validation = await validateReferencedProducts(normalizedItems);
      if (!validation.valid) {
        return res.status(validation.status).json({
          success: false,
          message: validation.error,
        });
      }
      combo.items = normalizedItems;
    }

    if (name !== undefined) combo.name = name.trim();
    if (description !== undefined) combo.description = description.trim();
    if (image !== undefined) combo.image = image;
    if (price !== undefined) combo.price = Number(price);
    if (preparationTime !== undefined)
      combo.preparationTime = Number(preparationTime);
    if (sortOrder !== undefined) combo.sortOrder = Number(sortOrder);
    if (isAvailable !== undefined) combo.isAvailable = Boolean(isAvailable);

    await combo.save();

    const populatedCombo = await Combo.findById(combo._id).populate(
      "items.product",
      "name price image"
    );

    return res.status(200).json({
      success: true,
      message: "Combo updated successfully",
      data: {
        combo: formatCombo(populatedCombo),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating combo",
    });
  }
};

const deleteCombo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid combo ID format",
      });
    }

    const combo = await Combo.findById(id);
    if (!combo) {
      return res.status(404).json({
        success: false,
        message: "Combo not found",
      });
    }

    combo.isAvailable = false;
    await combo.save();

    return res.status(200).json({
      success: true,
      message: "Combo disabled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while disabling combo",
    });
  }
};

module.exports = {
  getCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
};
