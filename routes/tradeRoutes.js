const express = require("express");
const multer = require("multer");

const {
    createTrade,
    extractTradeFromScreenshot,
    getTrades,
    getTradeById,
    updateTrade,
    deleteTrade,
    closeTrade
} = require("../controllers/tradeController");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    }
});

router.post("/ocr", upload.single("screenshot"), extractTradeFromScreenshot);
router.post("/", createTrade);
router.get("/", getTrades);
router.get("/:id", getTradeById);
router.put("/:id", updateTrade);
router.delete("/:id", deleteTrade);
router.patch("/:id/close", closeTrade);

module.exports = router;
