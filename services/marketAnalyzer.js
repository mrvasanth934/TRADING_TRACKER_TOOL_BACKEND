// Get candle body direction
const getCandleDirection = (candle) => {
  if (candle.close > candle.open) {
    return "BULLISH";
  }

  if (candle.close < candle.open) {
    return "BEARISH";
  }

  return "NEUTRAL";
};

// Detect trend using recent highs and lows
const detectTrend = (candles) => {
  if (!candles || candles.length < 5) {
    return "NOT_ENOUGH_DATA";
  }

  const recent = candles.slice(-5);

  const first = recent[0];
  const last = recent[recent.length - 1];

  const highestBefore = Math.max(
    recent[0].high,
    recent[1].high,
    recent[2].high
  );

  const highestAfter = Math.max(
    recent[2].high,
    recent[3].high,
    recent[4].high
  );

  const lowestBefore = Math.min(
    recent[0].low,
    recent[1].low,
    recent[2].low
  );

  const lowestAfter = Math.min(
    recent[2].low,
    recent[3].low,
    recent[4].low
  );

  if (
    highestAfter > highestBefore &&
    lowestAfter > lowestBefore &&
    last.close > first.close
  ) {
    return "UPTREND";
  }

  if (
    highestAfter < highestBefore &&
    lowestAfter < lowestBefore &&
    last.close < first.close
  ) {
    return "DOWNTREND";
  }

  return "SIDEWAYS";
};

// Detect simple 3-candle Fair Value Gap
const detectFVG = (candles) => {
  const fvgList = [];

  if (!candles || candles.length < 3) {
    return fvgList;
  }

  for (let i = 2; i < candles.length; i++) {
    const first = candles[i - 2];
    const middle = candles[i - 1];
    const third = candles[i];

    // Bullish FVG
    if (third.low > first.high) {
      fvgList.push({
        type: "BULLISH",
        from: first.high,
        to: third.low,
        candleIndex: i,
        datetime: third.datetime
      });
    }

    // Bearish FVG
    if (third.high < first.low) {
      fvgList.push({
        type: "BEARISH",
        from: third.high,
        to: first.low,
        candleIndex: i,
        datetime: third.datetime
      });
    }
  }

  return fvgList;
};

// Detect possible Order Blocks
const detectOrderBlocks = (candles) => {
  const orderBlocks = [];

  if (!candles || candles.length < 3) {
    return orderBlocks;
  }

  for (let i = 1; i < candles.length - 1; i++) {
    const previous = candles[i - 1];
    const current = candles[i];
    const next = candles[i + 1];

    const currentBody = Math.abs(current.close - current.open);

    const previousBody = Math.abs(
      previous.close - previous.open
    );

    // Possible bullish order block
    if (
      getCandleDirection(previous) === "BEARISH" &&
      getCandleDirection(current) === "BULLISH" &&
      getCandleDirection(next) === "BULLISH" &&
      currentBody > previousBody
    ) {
      orderBlocks.push({
        type: "BULLISH",
        high: previous.high,
        low: previous.low,
        datetime: previous.datetime
      });
    }

    // Possible bearish order block
    if (
      getCandleDirection(previous) === "BULLISH" &&
      getCandleDirection(current) === "BEARISH" &&
      getCandleDirection(next) === "BEARISH" &&
      currentBody > previousBody
    ) {
      orderBlocks.push({
        type: "BEARISH",
        high: previous.high,
        low: previous.low,
        datetime: previous.datetime
      });
    }
  }

  return orderBlocks;
};

// Detect recent support and resistance
const detectSupportResistance = (candles) => {
  if (!candles || candles.length < 5) {
    return {
      support: null,
      resistance: null
    };
  }

  const recent = candles.slice(-20);

  const support = Math.min(
    ...recent.map((candle) => candle.low)
  );

  const resistance = Math.max(
    ...recent.map((candle) => candle.high)
  );

  return {
    support,
    resistance
  };
};

// Detect possible double top
const detectDoubleTop = (candles) => {
  if (!candles || candles.length < 5) {
    return null;
  }

  const recent = candles.slice(-20);

  let firstHigh = null;
  let secondHigh = null;

  for (let i = 1; i < recent.length - 1; i++) {
    const previous = recent[i - 1];
    const current = recent[i];
    const next = recent[i + 1];

    if (
      current.high > previous.high &&
      current.high > next.high
    ) {
      if (!firstHigh) {
        firstHigh = current;
      } else {
        secondHigh = current;
      }
    }
  }

  if (!firstHigh || !secondHigh) {
    return null;
  }

  const difference = Math.abs(
    firstHigh.high - secondHigh.high
  );

  const averagePrice =
    (firstHigh.high + secondHigh.high) / 2;

  const tolerance = averagePrice * 0.003;

  if (difference <= tolerance) {
    return {
      detected: true,
      firstHigh: firstHigh.high,
      secondHigh: secondHigh.high,
      tolerance
    };
  }

  return null;
};

// Detect possible double bottom
const detectDoubleBottom = (candles) => {
  if (!candles || candles.length < 5) {
    return null;
  }

  const recent = candles.slice(-20);

  let firstLow = null;
  let secondLow = null;

  for (let i = 1; i < recent.length - 1; i++) {
    const previous = recent[i - 1];
    const current = recent[i];
    const next = recent[i + 1];

    if (
      current.low < previous.low &&
      current.low < next.low
    ) {
      if (!firstLow) {
        firstLow = current;
      } else {
        secondLow = current;
      }
    }
  }

  if (!firstLow || !secondLow) {
    return null;
  }

  const difference = Math.abs(
    firstLow.low - secondLow.low
  );

  const averagePrice =
    (firstLow.low + secondLow.low) / 2;

  const tolerance = averagePrice * 0.003;

  if (difference <= tolerance) {
    return {
      detected: true,
      firstLow: firstLow.low,
      secondLow: secondLow.low,
      tolerance
    };
  }

  return null;
};

module.exports = {
  detectTrend,
  detectFVG,
  detectOrderBlocks,
  detectSupportResistance,
  detectDoubleTop,
  detectDoubleBottom
};