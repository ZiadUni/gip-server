// Booking.js - Mongoose schema for event/venue bookings

// Stores: user ID, booking type (event/venue),
// itemId (linked to event/venue), details object (like time, price),
// status (confirmed, cancelled), and timestamp

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
  venueRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  },
  details: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

bookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Booking', bookingSchema);
