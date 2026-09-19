const express = require("express");

const {
  runMonitoring
} = require("../controllers/monitorController");

const router = express.Router();

router.post("/run", runMonitoring);

module.exports = router;