const express = require("express");

const {
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
  markNotificationAsRead
} = require("../controllers/notificationController");

const router = express.Router();

router.post("/", createNotification);

router.get("/", getNotifications);

router.get("/:id", getNotificationById);

router.put("/:id", updateNotification);

router.delete("/:id", deleteNotification);

router.patch("/:id/read", markNotificationAsRead);

module.exports = router;