const axios = require("axios");

const BASE_URL = "https://api.twelvedata.com";

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Stores last successful response per cache key.
// TTL: 60 seconds — matches TwelveData's per-minute rate limit window.
const cache = {};
const CACHE_TTL_MS = 60 * 1000;

function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null; // expired
  return entry.data;
}

function setCache(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

// ─── Symbol normalisation ─────────────────────────────────────────────────────
const SYMBOL_MAP = {
  "XAUUSD": "XAU/USD",
  "EURUSD": "EUR/USD",
  "GBPUSD": "GBP/USD",
  "USDJPY": "USD/JPY",
  "AUDUSD": "AUD/USD",
  "BTCUSD": "BTC/USD",
  "NAS100": "NDX",
  "US30":   "DJI"
};

const normalizeSymbol = (symbol) =>
  SYMBOL_MAP[symbol.toUpperCase()] || symbol;

// ─── getCurrentPrice ──────────────────────────────────────────────────────────
const getCurrentPrice = async (symbol) => {
  const formattedSymbol = normalizeSymbol(symbol);
  const cacheKey = `price:${formattedSymbol}`;

  // Return cached data if still fresh
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[cache hit] ${cacheKey}`);
    return cached;
  }

  try {
    const response = await axios.get(`${BASE_URL}/price`, {
      params: {
        symbol: formattedSymbol,
        apikey: process.env.TWELVE_DATA_API_KEY
      }
    });

    const data = response.data;

    if (data.status === "error") {
      throw new Error(data.message);
    }

    const result = {
      symbol: formattedSymbol,
      price: Number(data.price)
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    // If API fails, return stale cache rather than crashing
    const stale = cache[cacheKey];
    if (stale) {
      console.warn(`[stale cache] ${cacheKey} — returning last known price`);
      return { ...stale.data, stale: true };
    }
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch market price"
    );
  }
};

// ─── getCandles ───────────────────────────────────────────────────────────────
const getCandles = async (symbol, interval = "5min", outputsize = 100) => {
  const formattedSymbol = normalizeSymbol(symbol);
  const cacheKey = `candles:${formattedSymbol}:${interval}:${outputsize}`;

  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[cache hit] ${cacheKey}`);
    return cached;
  }

  try {
    const response = await axios.get(`${BASE_URL}/time_series`, {
      params: {
        symbol: formattedSymbol,
        interval,
        outputsize,
        apikey: process.env.TWELVE_DATA_API_KEY
      }
    });

    const data = response.data;

    if (data.status === "error") {
      throw new Error(data.message);
    }

    if (!data.values) {
      throw new Error("No market candle data found");
    }

    const candles = data.values.map((candle) => ({
      datetime: candle.datetime,
      open:   Number(candle.open),
      high:   Number(candle.high),
      low:    Number(candle.low),
      close:  Number(candle.close),
      volume: candle.volume ? Number(candle.volume) : null
    }));

    const result = {
      symbol:   data.meta?.symbol || formattedSymbol,
      interval: data.meta?.interval || interval,
      candles
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    // Return stale cache on rate-limit or network error
    const stale = cache[cacheKey];
    if (stale) {
      console.warn(`[stale cache] ${cacheKey} — returning last known candles`);
      return { ...stale.data, stale: true };
    }
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch market candles"
    );
  }
};

module.exports = { getCurrentPrice, getCandles };
