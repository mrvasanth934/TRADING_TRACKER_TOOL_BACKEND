const cron = require("node-cron");

const Alert = require("../models/Alert");
const Notification = require("../models/Notification");

const {
    getCurrentPrice,
    getCandles
} = require("./marketService");

const {
    detectFVG,
    detectOrderBlocks,
    detectSupportResistance,
    detectDoubleTop,
    detectDoubleBottom
} = require("./marketAnalyzer");

const triggeredAlerts = new Map();

// Check price alert
const checkPriceAlert = (alert, currentPrice) => {
    if (
        alert.targetPrice === null ||
        alert.targetPrice === undefined
    ) {
        return false;
    }

    if (alert.condition === "ABOVE") {
        return currentPrice >= alert.targetPrice;
    }

    if (alert.condition === "BELOW") {
        return currentPrice <= alert.targetPrice;
    }

    return false;
};

// Check technical alert
const checkTechnicalAlert = (
    alert,
    analysis,
    currentPrice
) => {
    if (alert.alertType === "FVG") {
        return analysis.fvg.length > 0;
    }

    if (alert.alertType === "ORDER_BLOCK") {
        return analysis.orderBlocks.length > 0;
    }

    if (alert.alertType === "SUPPORT") {
        setupKey = `SUPPORT-${analysis.support}`;
        if (analysis.support === null) {
            return false;
        }

        const tolerance = currentPrice * 0.001;

        return (
            Math.abs(currentPrice - analysis.support) <=
            tolerance
        );
    }

    if (alert.alertType === "RESISTANCE") {
        setupKey = `RESISTANCE-${analysis.resistance}`;
        if (analysis.resistance === null) {
            return false;
        }

        const tolerance = currentPrice * 0.001;

        return (
            Math.abs(currentPrice - analysis.resistance) <=
            tolerance
        );
    }

    if (alert.alertType === "DOUBLE_TOP") {
        return analysis.doubleTop !== null;
    }

    if (alert.alertType === "DOUBLE_BOTTOM") {
        return analysis.doubleBottom !== null;
    }

    return false;
};

// Create notification
const createAlertNotification = async (
    alert,
    currentPrice,
    setupKey
) => {
    const notificationKey = `${alert._id}-${setupKey}`;

    if (triggeredAlerts.has(notificationKey)) {
        return;
    }

    await Notification.create({
        title: `${alert.alertType} Alert`,
        message:
            alert.message ||
            `${alert.instrument} ${alert.alertType} alert triggered`,
        type:
            alert.alertType === "PRICE"
                ? "PRICE_ALERT"
                : alert.alertType,
        instrument: alert.instrument,
        alertId: alert._id,
        isRead: false
    });

    triggeredAlerts.set(notificationKey, true);

    console.log(
        `Notification created for ${alert.instrument} - ${alert.alertType}`
    );
};

// Monitor one alert
const monitorAlert = async (alert) => {
    const instrument = alert.instrument.toUpperCase();

    // Price alert
    if (alert.alertType === "PRICE") {
        const priceData = await getCurrentPrice(instrument);

        const currentPrice = priceData.price;

        const matched = checkPriceAlert(
            alert,
            currentPrice
        );

        const setupKey = `PRICE-${alert.condition}-${alert.targetPrice}`;

        const notificationKey = `${alert._id}-${setupKey}`;

        if (!matched) {
            triggeredAlerts.delete(notificationKey);
            return;
        }

        await createAlertNotification(
            alert,
            currentPrice,
            setupKey
        );

        return;
    }

    // Technical alerts use 15M candles
    const [
        candleData,
        priceData
    ] = await Promise.all([
        getCandles(
            instrument,
            alert.timeframe || "15min",
            100
        ),
        getCurrentPrice(instrument)
    ]);

    const candles = candleData.candles;
    const currentPrice = priceData.price;

    const analysis = {
        fvg: detectFVG(candles),

        orderBlocks: detectOrderBlocks(candles),

        ...detectSupportResistance(candles),

        doubleTop: detectDoubleTop(candles),

        doubleBottom: detectDoubleBottom(candles)
    };

    const matched = checkTechnicalAlert(
        alert,
        analysis,
        currentPrice
    );

    if (!matched) {
        const possibleKeys = [
            `${alert._id}-${alert.alertType}`
        ];

        possibleKeys.forEach((key) => {
            triggeredAlerts.delete(key);
        });

        return;
    }

    let setupKey = alert.alertType;

    if (alert.alertType === "FVG") {
        const latestFVG =
            analysis.fvg[analysis.fvg.length - 1];

        setupKey = `FVG-${latestFVG.datetime}-${latestFVG.from}-${latestFVG.to}`;
    }

    if (alert.alertType === "ORDER_BLOCK") {
        const latestOB =
            analysis.orderBlocks[
            analysis.orderBlocks.length - 1
            ];

        setupKey = `OB-${latestOB.datetime}-${latestOB.high}-${latestOB.low}`;
    }

    if (alert.alertType === "DOUBLE_TOP") {
        setupKey = `DOUBLE_TOP-${analysis.doubleTop.firstHigh}-${analysis.doubleTop.secondHigh}`;
    }

    if (alert.alertType === "DOUBLE_BOTTOM") {
        setupKey = `DOUBLE_BOTTOM-${analysis.doubleBottom.firstLow}-${analysis.doubleBottom.secondLow}`;
    }

    await createAlertNotification(
        alert,
        null,
        setupKey
    );
};

// Monitor all enabled alerts
const monitorAlerts = async () => {
    try {
        const alerts = await Alert.find({
            enabled: true
        });

        if (alerts.length === 0) {
            console.log("No enabled alerts to monitor");
            return;
        }

        console.log(
            `Monitoring ${alerts.length} enabled alert(s)`
        );

        for (const alert of alerts) {
            try {
                await monitorAlert(alert);
            } catch (error) {
                console.error(
                    `Alert monitoring failed for ${alert.instrument}:`,
                    error.message
                );
            }
        }
    } catch (error) {
        console.error(
            "Automatic monitoring failed:",
            error.message
        );
    }
};

// Start monitoring every minute
const startMonitoring = () => {
    cron.schedule("* * * * *", async () => {
        console.log(
            "Automatic monitoring started:",
            new Date().toLocaleString()
        );

        await monitorAlerts();
    });

    console.log(
        "Automatic monitoring service started"
    );
};

module.exports = {
    startMonitoring,
    monitorAlerts
};