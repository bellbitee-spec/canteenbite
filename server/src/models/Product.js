const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 5,
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    preparationTime: {
      type: Number,
      min: 0,
      default: 10,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    featuredBadge: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.8,
    },

    ratingCount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({
  category: 1,
  isAvailable: 1,
});

module.exports = mongoose.model("Product", productSchema);
