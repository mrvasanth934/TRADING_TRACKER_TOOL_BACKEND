const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
    {
        instrument: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },

        alertType: {
            type: String,
            required: true,
            enum: [
                "PRICE",
                "FVG",
                "ORDER_BLOCK",
                "SUPPORT",
                "RESISTANCE",
                "DOUBLE_TOP",
                "DOUBLE_BOTTOM"
            ]
        },

        targetPrice: {
            type: Number,
            default: null,
            min: 0
        },

        condition: {
            type: String,
            default: null,
            trim: true,
            uppercase: true
        },

        timeframe: {
            type: String,
            default: null,
            trim: true
        },

        enabled: {
            type: Boolean,
            default: true
        },

        message: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Alert", alertSchema);