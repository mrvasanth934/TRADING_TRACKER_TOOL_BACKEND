const Trade = require("../models/Trade");

// Calculate profit or loss
const calculateProfitLoss = (tradeType, entryPrice, currentPrice) => {
    if (currentPrice === null || currentPrice === undefined) {
        return 0;
    }

    if (tradeType === "BUY") {
        return currentPrice - entryPrice;
    }

    if (tradeType === "SELL") {
        return entryPrice - currentPrice;
    }

    return 0;
};

// Create a new trade
const createTrade = async (req, res) => {
    try {
        const {
            instrument,
            tradeType,
            entryPrice,
            stopLoss,
            takeProfit,
            quantity,
            lotSize,
            entryTime,
            currentPrice,
            notes
        } = req.body;

        if (!instrument || !tradeType || entryPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "Instrument, trade type and entry price are required"
            });
        }

        const profitLoss = calculateProfitLoss(
            tradeType,
            Number(entryPrice),
            currentPrice !== undefined ? Number(currentPrice) : null
        );

        const trade = await Trade.create({
            instrument,
            tradeType,
            entryPrice,
            stopLoss,
            takeProfit,
            quantity,
            lotSize,
            entryTime,
            currentPrice,
            profitLoss,
            notes
        });

        res.status(201).json({
            success: true,
            message: "Trade created successfully",
            data: trade
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all trades
const getTrades = async (req, res) => {
    try {
        const trades = await Trade.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Trades fetched successfully",
            data: trades
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single trade
const getTradeById = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                success: false,
                message: "Trade not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Trade fetched successfully",
            data: trade
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update trade
const updateTrade = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                success: false,
                message: "Trade not found"
            });
        }

        const allowedFields = [
            "instrument",
            "tradeType",
            "entryPrice",
            "stopLoss",
            "takeProfit",
            "quantity",
            "lotSize",
            "entryTime",
            "exitTime",
            "status",
            "currentPrice",
            "notes"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                trade[field] = req.body[field];
            }
        });

        if (
            trade.currentPrice !== null &&
            trade.currentPrice !== undefined
        ) {
            trade.profitLoss = calculateProfitLoss(
                trade.tradeType,
                trade.entryPrice,
                trade.currentPrice
            );
        }

        await trade.save();

        res.status(200).json({
            success: true,
            message: "Trade updated successfully",
            data: trade
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete trade
const deleteTrade = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                success: false,
                message: "Trade not found"
            });
        }

        await trade.deleteOne();

        res.status(200).json({
            success: true,
            message: "Trade deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Close active trade
const closeTrade = async (req, res) => {
    try {
        const { exitPrice} = req.body;
        if (exitPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "Exit price is required"
            });
        }

        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                success: false,
                message: "Trade not found"
            });
        }

        if (trade.status === "CLOSED") {
            return res.status(400).json({
                success: false,
                message: "Trade is already closed"
            });
        }

        trade.currentPrice = Number(exitPrice);
        trade.profitLoss = calculateProfitLoss(
            trade.tradeType,
            trade.entryPrice,
            Number(exitPrice)
        );

        trade.status = "CLOSED";
        trade.exitTime = new Date();

        await trade.save();

        res.status(200).json({
            success: true,
            message: "Trade closed successfully",
            data: trade
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createTrade,
    getTrades,
    getTradeById,
    updateTrade,
    deleteTrade,
    closeTrade
};