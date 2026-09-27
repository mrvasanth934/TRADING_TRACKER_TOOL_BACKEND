const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
    {
        orderID: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        instrument: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            default: "XAUUSD"
        },

        direction: {
            type: String,
            required: true,
            enum: ["BUY", "SELL"]
        },

        amount: {
            type: String,
            default: ""
        },

        openPrice: {
            type: Number,
            required: true,
            min: 0
        },

        closePrice: {
            type: Number,
            default: null,
            min: 0
        },

        closeReason: {
            type: String,
            default: "",
            trim: true
        },

        profitLoss: {
            type: Number,
            default: 0
        },

        profitLossStatus: {
            type: String,
            enum: ["PROFIT", "LOSS", "BREAK_EVEN"],
            default: "BREAK_EVEN"
        },

        priceMove: {
            type: Number,
            default: null
        },

        type: {
            type: String,
            default: "MARKET",
            trim: true
        },

        takeProfit: {
            type: Number,
            default: null,
            min: 0
        },

        stopLoss: {
            type: Number,
            default: null,
            min: 0
        },

        timeOpened: {
            type: Date,
            default: null
        },

        timeClosed: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);
module.exports = mongoose.model("Trade", tradeSchema);