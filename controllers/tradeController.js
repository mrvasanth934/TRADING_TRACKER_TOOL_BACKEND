const { createWorker } = require("tesseract.js");
const Trade = require("../models/Trade");

let ocrWorkerPromise;

const getOcrWorker = async () => {
    if (!ocrWorkerPromise) {
        ocrWorkerPromise = createWorker("eng");
    }

    return ocrWorkerPromise;
};

const cleanText = (text) => text
    .replace(/\r/g, "")
    .replace(/[|]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

const findValue = (text, label) => {
    const regex = new RegExp(`${label}\\s*:?\\s*(.+)`, "i");
    const match = text.match(regex);
    return match ? cleanText(match[1]) : "";
};

const findNumber = (text, label) => {
    const value = findValue(text, label);
    const match = value.match(/-?\$?\s*\d[\d,]*(?:\.\d+)?/);
    return match ? Number(match[0].replace(/[$,\s]/g, "")) : null;
};

const findPercent = (text, label) => {
    const value = findValue(text, label);
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
};

const parseDateTime = (value) => {
    if (!value) return null;

    const match = value.match(
        /(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
    );

    if (!match) return null;

    let [, day, month, year, hour, minute, second = "00"] = match;

    year = Number(year);

    if (year < 100) {
        year += 2000;
    }

    const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;

    return formattedDate;
};
const parseAmount = (text) => {
    const value = findValue(text, "Amount");
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
};

const parseTpSl = (text) => {
    const value = findValue(text, "Take Profit\\s*\\/\\s*Stop Loss");
    const numbers = value.match(/-?\d[\d,]*(?:\.\d+)?/g) || [];

    return {
        takeProfit: numbers[0] ? Number(numbers[0].replace(/,/g, "")) : null,
        stopLoss: numbers[1] ? Number(numbers[1].replace(/,/g, "")) : null
    };
};

const parseBrokerTradeText = (rawText) => {
    const text = cleanText(rawText);

    const tpSl = parseTpSl(text);

    const brokerInstrument = findValue(text, "Instrument")
        .split(/\s+/)[0]
        .toUpperCase()
        .replace(/[^A-Z0-9/]/g, "");

    const normalizedInstrument = brokerInstrument.replace(/[^A-Z]/g, "");

    const isGoldInstrument =
        normalizedInstrument === "XAUUSD" ||
        normalizedInstrument === "XAU" ||
        normalizedInstrument.startsWith("GOLD");

    const profitLoss = findNumber(text, "Profit/Loss");

    let profitLossStatus = "BREAK_EVEN";

    if (profitLoss > 0) {
        profitLossStatus = "PROFIT";
    } else if (profitLoss < 0) {
        profitLossStatus = "LOSS";
    }

    return {
        isGoldInstrument,

        orderID: findValue(text, "Order ID")
            .split(/\s+/)[0],

        instrument: "XAUUSD",

        direction: findValue(text, "Direction")
            .split(/\s+/)[0]
            .toUpperCase(),

        amount: parseAmount(text),

        openPrice: findNumber(text, "Open Price"),

        closePrice: findNumber(text, "Close Price"),

        closeReason: findValue(text, "Close Reason"),

        profitLoss,

        profitLossStatus,

        priceMove: findPercent(text, "Price Move"),

        type: findValue(text, "Type")
            .split(/\s+/)[0]
            .toUpperCase() || "MARKET",

        takeProfit: tpSl.takeProfit,

        stopLoss: tpSl.stopLoss,

        timeOpened: parseDateTime(
            findValue(text, "Time Opened")
        ),

        timeClosed: parseDateTime(
            findValue(text, "Time Closed")
        ),

        rawText
    };
};

const calculateProfitLoss = (direction, openPrice, closePrice) => {
    if (closePrice === null || closePrice === undefined) return 0;

    if (direction === "BUY") {
        return closePrice - openPrice;
    }

    if (direction === "SELL") {
        return openPrice - closePrice;
    }

    return 0;
};

const createTrade = async (req, res) => {
    try {
        const {
            orderID,
            instrument = "XAUUSD",
            direction,
            amount,
            openPrice,
            closePrice,
            closeReason,
            profitLoss,
            priceMove,
            type,
            takeProfit,
            stopLoss,
            timeOpened,
            timeClosed
        } = req.body;

        if (!orderID) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        if (!direction || !["BUY", "SELL"].includes(direction.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Direction must be BUY or SELL"
            });
        }

        if (openPrice === undefined || openPrice === null) {
            return res.status(400).json({
                success: false,
                message: "Open price is required"
            });
        }

        const existingTrade = await Trade.findOne({
            orderID
        });

        if (existingTrade) {
            return res.status(409).json({
                success: false,
                message: `Order ID ${req.body.orderID} already exists.`
            });
        }

        const finalProfitLoss = Number(profitLoss || 0);

        let profitLossStatus = "BREAK_EVEN";

        if (finalProfitLoss > 0) {
            profitLossStatus = "PROFIT";
        } else if (finalProfitLoss < 0) {
            profitLossStatus = "LOSS";
        }

        const trade = await Trade.create({
            orderID,
            instrument: "XAUUSD",
            direction: direction.toUpperCase(),
            amount,
            openPrice,
            closePrice,
            closeReason,
            profitLoss: finalProfitLoss,
            profitLossStatus,
            priceMove,
            type,
            takeProfit,
            stopLoss,
            timeOpened,
            timeClosed
        });

        res.status(201).json({
            success: true,
            message: "Trade created successfully",
            data: trade
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Order ID already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const extractTradeFromScreenshot = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Trade screenshot is required"
            });
        }

        const worker = await getOcrWorker();
        const { data } = await worker.recognize(req.file.buffer);

        const extracted = parseBrokerTradeText(data.text);

        // Return whatever was successfully extracted
        // Frontend will prefill the form and user can correct/complete missing fields
        const hasAnyUsefulData =
            extracted.orderID ||
            extracted.openPrice !== null ||
            extracted.direction ||
            extracted.closePrice !== null;

        if (!hasAnyUsefulData) {
            return res.status(422).json({
                success: false,
                message: "Could not extract any trade details from this screenshot. Please make sure the image is clear and contains broker trade information.",
                rawText: data.text
            });
        }

        res.status(200).json({
            success: true,
            message: "Trade details extracted successfully",
            data: extracted
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ instrument: "XAUUSD" }).sort({ createdAt: -1 });

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
            "direction",
            "amount",
            "openPrice",
            "closePrice",
            "closeReason",
            "profitLoss",
            "priceMove",
            "type",
            "takeProfit",
            "stopLoss",
            "timeOpened",
            "timeClosed"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                trade[field] = req.body[field];
            }
        });

        const finalProfitLoss = Number(trade.profitLoss || 0);

        if (finalProfitLoss > 0) {
            trade.profitLossStatus = "PROFIT";
        } else if (finalProfitLoss < 0) {
            trade.profitLossStatus = "LOSS";
        } else {
            trade.profitLossStatus = "BREAK_EVEN";
        }

        trade.instrument = "XAUUSD";

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

const closeTrade = async (req, res) => {
    try {
        const { closePrice, profitLoss, closeReason } = req.body;

        if (closePrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "Close price is required"
            });
        }

        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return res.status(404).json({
                success: false,
                message: "Trade not found"
            });
        }

        if (trade.closePrice !== null && trade.closePrice !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Trade is already closed"
            });
        }

        const finalClosePrice = Number(closePrice);

        const finalProfitLoss =
            profitLoss !== undefined
                ? Number(profitLoss)
                : calculateProfitLoss(
                    trade.direction,
                    trade.openPrice,
                    finalClosePrice
                );

        trade.closePrice = finalClosePrice;
        trade.profitLoss = finalProfitLoss;
        trade.closeReason = closeReason || "Manual";
        trade.timeClosed = new Date();

        if (finalProfitLoss > 0) {
            trade.profitLossStatus = "PROFIT";
        } else if (finalProfitLoss < 0) {
            trade.profitLossStatus = "LOSS";
        } else {
            trade.profitLossStatus = "BREAK_EVEN";
        }

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
    extractTradeFromScreenshot,
    getTrades,
    getTradeById,
    updateTrade,
    deleteTrade,
    closeTrade
};
