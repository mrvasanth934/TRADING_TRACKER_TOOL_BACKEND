const express = require("express");

const { createAlert, getAlerts, getAlertById, updateAlert, toggleAlert, deleteAlert } = require("../controllers/alertController");

const router = express.Router();

router.post("/", createAlert);

router.get("/", getAlerts);

router.get("/:id", getAlertById);

router.put("/:id", updateAlert);

router.delete("/:id", toggleAlert);

router.patch("/:id/close", deleteAlert);

module.exports = router;