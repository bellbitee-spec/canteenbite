const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderItem",
        required: true,
      },
    ],

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    orderStatus: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "COMPLETED",
        "CANCELLED",
        "DELAYED",
      ],
      default: "PENDING",
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "COD", "ONLINE"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },

    cancellationWindowOpen: {
      type: Boolean,
      default: false,
      index: true,
    },

    idempotencyKey: {
      type: String,
      default: null,
    },

    cancelUntil: {
      type: Date,
      default: null,
      index: true,
    },

    cancelledBy: {
      type: String,
      enum: ["STUDENT", "ADMIN", "SYSTEM", null],
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    estimatedPreparationTime: {
      type: Number,
      min: 0,
      default: 15,
    },

    estimatedPreparationMinutes: {
      type: Number,
      min: 0,
      default: 15,
    },

    expectedReadyAt: {
      type: Date,
      default: null,
    },

    estimatedReadyAt: {
      type: Date,
      default: null,
    },

    preparationEstimateUpdatedAt: {
      type: Date,
      default: null,
    },

    preparationStartedAt: {
      type: Date,
      default: null,
    },

    readyAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    delayedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.index({
  user: 1,
  createdAt: -1,
});

orderSchema.index({
  orderStatus: 1,
  createdAt: -1,
});

orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  }
);

// Sorting index for admin dashboard queries
orderSchema.index({ createdAt: -1 });

// Composite index for periodic cleanup of abandoned online orders
orderSchema.index({
  paymentMethod: 1,
  orderStatus: 1,
  paymentStatus: 1,
  createdAt: 1,
});

module.exports = mongoose.model("Order", orderSchema);

