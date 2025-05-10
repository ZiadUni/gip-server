// Notification.js - Mongoose schema for slot/seat availability alerts

// Stores: user ID, booking type (event/venue),
// itemId (e.g., "VenueName__2024-05-11"), details (slot time/date),
// and status (pending or notified)

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['event', 'venue'],
    required: true
  },
  itemId: {
    type: String,
    required: true
  },
  details: {
    type: Object
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'viewed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
