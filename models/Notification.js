const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      required: true,
      enum: [
        "PRICE_ALERT",
        "FVG",
        "ORDER_BLOCK",
        "SUPPORT",
        "RESISTANCE",
        "DOUBLE_TOP",
        "DOUBLE_BOTTOM",
        "SYSTEM"
      ]
    },

    instrument: {
      type: String,
      trim: true,
      uppercase: true,
      default: "XAUUSD",
      enum: ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "BTCUSD", "NAS100", "US30"]
    },

    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alert",
      default: null
    },

    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Notification", notificationSchema);