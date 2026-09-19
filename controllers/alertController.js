const Alert = require("../models/Alert");

// Create alert
const createAlert = async (req, res) => {
    try {
        const {
            instrument,
            alertType,
            targetPrice,
            condition,
            timeframe,
            enabled,
            message
        } = req.body;

        if (!instrument || !alertType) {
            return res.status(400).json({
                success: false,
                message: "Instrument and alert type are required"
            });
        }

        if (alertType === "PRICE") {
            if (targetPrice === undefined || targetPrice === null) {
                return res.status(400).json({
                    success: false,
                    message: "Target price is required for price alert"
                });
            }

            if (!condition || !["ABOVE", "BELOW"].includes(condition.toUpperCase())) {
                return res.status(400).json({
                    success: false,
                    message: "Price alert condition must be ABOVE or BELOW"
                });
            }
        }

        const alert = await Alert.create({
            instrument,
            alertType,
            targetPrice,
            condition,
            timeframe,
            enabled,
            message
        });

        res.status(201).json({
            success: true,
            message: "Alert created successfully",
            data: alert
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all alerts
const getAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Alerts fetched successfully",
            data: alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single alert
const getAlertById = async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Alert fetched successfully",
            data: alert
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update alert
const updateAlert = async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        const allowedFields = [
            "instrument",
            "alertType",
            "targetPrice",
            "condition",
            "timeframe",
            "enabled",
            "message"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                alert[field] = req.body[field];
            }
        });

        if (alert.alertType === "PRICE") {
            if (alert.targetPrice === null || alert.targetPrice === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "Target price is required for price alert"
                });
            }

            if (
                !alert.condition ||
                !["ABOVE", "BELOW"].includes(alert.condition.toUpperCase())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Price alert condition must be ABOVE or BELOW"
                });
            }
        }

        await alert.save();

        res.status(200).json({
            success: true,
            message: "Alert updated successfully",
            data: alert
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete alert
const deleteAlert = async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        await alert.deleteOne();

        res.status(200).json({
            success: true,
            message: "Alert deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Enable / Disable alert
const toggleAlert = async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        alert.enabled = !alert.enabled;

        await alert.save();

        res.status(200).json({
            success: true,
            message: alert.enabled
                ? "Alert enabled successfully"
                : "Alert disabled successfully",
            data: alert
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createAlert,
    getAlerts,
    getAlertById,
    updateAlert,
    deleteAlert,
    toggleAlert
};