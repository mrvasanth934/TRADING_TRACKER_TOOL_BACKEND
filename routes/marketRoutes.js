const express = require("express");

const {
  getMarketPrice,
  getMarketCandles,
  analyzeMarket
} = require("../controllers/marketController");

const router = express.Router();

router.get("/price/:symbol", getMarketPrice);

router.get("/candles/:symbol", getMarketCandles);

router.get("/analyze/:symbol", analyzeMarket);

module.exports = router;