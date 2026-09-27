require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const { startMonitoring } = require("./services/monitoringService");

const tradeRoutes = require("./routes/tradeRoutes");
const alertRoutes = require("./routes/alertRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const marketRoutes = require("./routes/marketRoutes");
const monitorRoutes = require("./routes/monitorRoutes");

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "https://trading-tracker-tool-backend.onrender.com/"
];


app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "TradeTrack backend is running"
    });
});

app.use("/api/trades", tradeRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/monitor", monitorRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    startMonitoring();

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

startServer();
