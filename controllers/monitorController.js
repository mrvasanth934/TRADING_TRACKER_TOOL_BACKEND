const {
  monitorAlerts
} = require("../services/monitoringService");

const runMonitoring = async (req, res) => {
  try {
    await monitorAlerts();

    res.status(200).json({
      success: true,
      message: "Monitoring completed successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  runMonitoring
};