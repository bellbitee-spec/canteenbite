const mongoose = require("mongoose");

const scheduleEntrySchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },

    openingTime: {
      type: String,
      default: "09:00",
    },

    closingTime: {
      type: String,
      default: "16:00",
    },
  },
  {
    _id: false,
  }
);

const storeScheduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Default Schedule",
      trim: true,
    },

    entries: {
      type: [scheduleEntrySchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "StoreSchedule",
  storeScheduleSchema
);
