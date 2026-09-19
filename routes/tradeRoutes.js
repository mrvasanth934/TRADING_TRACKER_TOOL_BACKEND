const express = require("express");

const {
    createTrade,
    getTrades,
    getTradeById,
    updateTrade,
    deleteTrade,
    closeTrade
} = require("../controllers/tradeController");

const router = express.Router();

router.post("/", createTrade);

router.get("/", getTrades);

router.get("/:id", getTradeById);

router.put("/:id", updateTrade);

router.delete("/:id", deleteTrade);

router.patch("/:id/close", closeTrade);

module.exports = router;