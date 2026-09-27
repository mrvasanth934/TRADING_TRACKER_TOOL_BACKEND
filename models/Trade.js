const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
    {
        orderID: {
            type: String,
            default:"orderID"
        },
        account: {
            type: String,
            enum: ["Priya_Vasanth", "Vasanth", "Sarath"],
            default:"Priya_Vasanth"
        },
        timeZone: {
            type:String,
            enum:["SYDNEY","LONDON","NEW YORK"],
            default:"NEW YORK"
        },
        instrument: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            default:"XAUUSD",
            enum: ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "BTCUSD", "NAS100", "US30"]
        },

        tradeType: {
            type: String,
            required: true,
            enum: ["BUY", "SELL"]
        },

        entryPrice: {
            type: Number,
            required: true,
            min: 0
        },

        stopLoss: {
            type: Number,
            default: null,
            min: 0
        },

        takeProfit: {
            type: Number,
            default: null,
            min: 0
        },

        quantity: {
            type: Number,
            default: null,
            min: 0
        },

        lotSize: {
            type: Number,
            default: null,
            min: 0
        },

        entryTime: {
            type: Date,
            default: Date.now
        },

        exitTime: {
            type: Date,
            default: null
        },

        status: {
            type: String,
            enum: ["ACTIVE", "CLOSED"],
            default: "ACTIVE"
        },

        currentPrice: {
            type: Number,
            default: null,
            min: 0
        },

        profitLoss: {
            type: Number,
            default: 0
        },

        notes: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Trade", tradeSchema);