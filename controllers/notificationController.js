const Notification = require("../models/Notification");

// Create notification
const createNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      instrument,
      alertId,
      isRead
    } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: "Title, message and type are required"
      });
    }

    const notification = await Notification.create({
      title,
      message,
      type,
      instrument,
      alertId,
      isRead
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single notification
const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification fetched successfully",
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update notification
const updateNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    const allowedFields = [
      "title",
      "message",
      "type",
      "instrument",
      "alertId",
      "isRead"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        notification[field] = req.body[field];
      }
    });

    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    notification.isRead = true;

    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
  markNotificationAsRead
};