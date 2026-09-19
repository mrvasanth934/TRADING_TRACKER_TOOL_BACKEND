const axios = require("axios");

const BASE_URL = "https://api.twelvedata.com";

// Get current market price
const getCurrentPrice = async (symbol) => {
  try {
    const response = await axios.get(`${BASE_URL}/price`, {
      params: {
        symbol,
        apikey: process.env.TWELVE_DATA_API_KEY
      }
    });

    const data = response.data;

    if (data.status === "error") {
      throw new Error(data.message);
    }

    return {
      symbol: data.symbol,
      price: Number(data.price)
    };
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch market price"
    );
  }
};

// Get OHLC candles
const getCandles = async (symbol, interval = "5min", outputsize = 100) => {
  try {
    const response = await axios.get(`${BASE_URL}/time_series`, {
      params: {
        symbol,
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
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: candle.volume ? Number(candle.volume) : null
    }));

    return {
      symbol: data.meta?.symbol || symbol,
      interval: data.meta?.interval || interval,
      candles
    };
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch market candles"
    );
  }
};

module.exports = {
  getCurrentPrice,
  getCandles
};