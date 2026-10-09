const mongoose = require("mongoose");

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
      trim: true,
      default: "My Canteen",
    },

    isOpen: {
      type: Boolean,
      default: false,
      index: true,
    },

    manualOverride: {
      type: Boolean,
      default: false,
    },

    acceptingOrders: {
      type: Boolean,
      default: true,
    },

    defaultPreparationTime: {
      type: Number,
      min: 0,
      default: 10,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    cancellationWindowSeconds: {
      type: Number,
      min: 1,
      default: 30,
    },

    temporaryClosedReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "StoreSettings",
  storeSettingsSchema
);
