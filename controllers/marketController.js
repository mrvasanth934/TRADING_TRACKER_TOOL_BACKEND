const {
  getCurrentPrice,
  getCandles
} = require("../services/marketService");

const {
  detectTrend,
  detectFVG,
  detectOrderBlocks,
  detectSupportResistance,
  detectDoubleTop,
  detectDoubleBottom
} = require("../services/marketAnalyzer");

// Get current market price
const getMarketPrice = async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required"
      });
    }

    const data = await getCurrentPrice(symbol.toUpperCase());

    res.status(200).json({
      success: true,
      message: "Market price fetched successfully",
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get market candles
const getMarketCandles = async (req, res) => {
  try {
    const { symbol } = req.params;

    const interval = req.query.interval || "5min";

    const allowedIntervals = [
      "5min",
      "15min",
      "30min",
      "1h",
      "4h"
    ];

    if (!allowedIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interval"
      });
    }

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required"
      });
    }

    const data = await getCandles(
      symbol.toUpperCase(),
      interval
    );

    res.status(200).json({
      success: true,
      message: "Market candles fetched successfully",
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Analyze market
const analyzeMarket = async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required"
      });
    }

    const instrument = symbol.toUpperCase();

    // Fetch candles for different timeframes
    const [
      candles4H,
      candles1H,
      candles30M,
      candles15M,
      candles5M
    ] = await Promise.all([
      getCandles(instrument, "4h", 100),
      getCandles(instrument, "1h", 100),
      getCandles(instrument, "30min", 100),
      getCandles(instrument, "15min", 100),
      getCandles(instrument, "5min", 100)
    ]);

    // Get current price
    const currentPriceData = await getCurrentPrice(instrument);

    // Detect trends
    const trend = {
      "4H": detectTrend(candles4H.candles),
      "1H": detectTrend(candles1H.candles),
      "30M": detectTrend(candles30M.candles),
      "15M": detectTrend(candles15M.candles),
      "5M": detectTrend(candles5M.candles)
    };

    // Use 15M candles for technical setup detection
    const analysisCandles = candles15M.candles;

    const fvg = detectFVG(analysisCandles);

    const orderBlocks = detectOrderBlocks(
      analysisCandles
    );

    const supportResistance =
      detectSupportResistance(analysisCandles);

    const doubleTop =
      detectDoubleTop(analysisCandles);

    const doubleBottom =
      detectDoubleBottom(analysisCandles);

    res.status(200).json({
      success: true,
      message: "Market analysis completed successfully",
      data: {
        instrument,
        currentPrice: currentPriceData.price,

        trend,

        fvg,

        orderBlocks,

        support: supportResistance.support,

        resistance: supportResistance.resistance,

        doubleTop,

        doubleBottom
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getMarketPrice,
  getMarketCandles,
  analyzeMarket
};