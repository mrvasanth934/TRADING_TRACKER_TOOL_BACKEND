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

    const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;

    let [, day, month, year, hour, minute, second = "00"] = match;
    year = Number(year);
    if (year < 100) year += 2000;

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
    );

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
    const text = cleanText(rawText).replace(/\n/g, "\n");
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

    return {
        isGoldInstrument,
        symbol: "XAUUSD",
        instrument: "XAUUSD",
        orderID: findValue(text, "Order ID").split(/\s+/)[0],
        ticket: findValue(text, "Ticket").split(/\s+/)[0],
        direction: findValue(text, "Direction").split(/\s+/)[0].toUpperCase(),
        amount: parseAmount(text),
        entryPrice: findNumber(text, "Open Price"),
        exitPrice: findNumber(text, "Close Price"),
        closeReason: findValue(text, "Close Reason"),
        profitLoss: findNumber(text, "Profit/Loss"),
        priceMove: findPercent(text, "Price Move"),
        swaps: findNumber(text, "Swaps") ?? 0,
        type: findValue(text, "Type").split(/\s+/)[0].toUpperCase() || "MARKET",
        takeProfit: tpSl.takeProfit,
        stopLoss: tpSl.stopLoss,
        entryTime: parseDateTime(findValue(text, "Time Opened")),
        exitTime: parseDateTime(findValue(text, "Time Closed")),
        serverEntryTime: parseDateTime(findValue(text, "Server Time Opened")),
        serverExitTime: parseDateTime(findValue(text, "Server Time Closed")),
        brokerInstrument,
        rawText
    };
};

const calculateProfitLoss = (tradeType, entryPrice, currentPrice) => {
    if (currentPrice === null || currentPrice === undefined) return 0;
    if (tradeType === "BUY") return currentPrice - entryPrice;
    if (tradeType === "SELL") return entryPrice - currentPrice;
    return 0;
};

const createTrade = async (req, res) => {
    try {
        const {
            instrument = "XAUUSD",
            symbol,
            tradeType,
            direction,
            entryPrice,
            exitPrice,
            stopLoss,
            takeProfit,
            quantity,
            amount,
            lotSize,
            entryTime,
            exitTime,
            serverEntryTime,
            serverExitTime,
            currentPrice,
            profitLoss,
            closeReason,
            priceMove,
            swaps,
            type,
            orderID,
            ticket,
            notes,
            status
        } = req.body;

        const fixedInstrument = "XAUUSD";
        const fixedDirection = direction || tradeType;

        if (instrument !== fixedInstrument || (symbol && symbol !== fixedInstrument)) {
            return res.status(400).json({
                success: false,
                message: "TradeTrack supports XAUUSD only"
            });
        }

        if (!fixedDirection || entryPrice === undefined || entryPrice === null) {
            return res.status(400).json({
                success: false,
                message: "Direction and open price are required"
            });
        }

        const isClosed = status === "CLOSED" || exitPrice !== undefined && exitPrice !== null;

        const trade = await Trade.create({
            orderID,
            ticket,
            instrument: fixedInstrument,
            tradeType: fixedDirection,
            amount,
            entryPrice,
            exitPrice,
            stopLoss,
            takeProfit,
            quantity: quantity ?? amount,
            lotSize,
            entryTime,
            exitTime,
            serverEntryTime,
            serverExitTime,
            status: isClosed ? "CLOSED" : "ACTIVE",
            currentPrice: currentPrice ?? exitPrice ?? null,
            profitLoss: profitLoss ?? (isClosed
                ? calculateProfitLoss(fixedDirection, Number(entryPrice), Number(exitPrice))
                : 0),
            closeReason,
            priceMove,
            swaps,
            type,
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

        if (
            !extracted.isGoldInstrument ||
            !extracted.entryPrice ||
            !["BUY", "SELL"].includes(extracted.direction)
        ) {
            return res.status(422).json({
                success: false,
                message: "Could not reliably detect a valid XAUUSD trade, open price, and direction from this screenshot",
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
            "orderID", "ticket", "tradeType", "entryPrice", "exitPrice",
            "stopLoss", "takeProfit", "amount", "quantity", "lotSize",
            "entryTime", "exitTime", "serverEntryTime", "serverExitTime",
            "status", "currentPrice", "profitLoss", "closeReason",
            "priceMove", "swaps", "type", "notes"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) trade[field] = req.body[field];
        });

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
        const { exitPrice, profitLoss } = req.body;

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

        trade.exitPrice = Number(exitPrice);
        trade.currentPrice = Number(exitPrice);
        trade.profitLoss = profitLoss !== undefined
            ? Number(profitLoss)
            : calculateProfitLoss(trade.tradeType, trade.entryPrice, Number(exitPrice));
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
    extractTradeFromScreenshot,
    getTrades,
    getTradeById,
    updateTrade,
    deleteTrade,
    closeTrade
};
