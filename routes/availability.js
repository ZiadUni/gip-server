// availability.js - Real-time availability logic

// GET /api/availability/event/:itemId → returns 30-seat map
// GET /api/availability/venue/:itemId → returns 5 standard slots
// Seat/slot status is calculated based on confirmed bookings

const express = require('express');
const Booking = require('../models/Booking');
const router = express.Router();

// GET /api/availability/:type/:itemId
router.get('/availability/:type/:itemId', async (req, res) => {
  const { type, itemId } = req.params;

  if (!type || !itemId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const bookings = await Booking.find({
      type,
      itemId: itemId,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (type === 'event') {
      const seatMap = {};
      bookings.forEach(b => {
        (b.details.seats || []).forEach(id => {
          seatMap[id] = b.status;
        });
      });

      const totalSeats = 30;
      const seats = Array.from({ length: totalSeats }, (_, i) => ({
        id: i + 1,
        status: seatMap[i + 1] || 'available'
      }));

      return res.json({ type, itemId, seats });
    }

    if (type === 'venue') {
      const allSlots = [
        "8:00 AM - 10:00 AM",
        "10:00 AM - 12:00 PM",
        "12:00 PM - 2:00 PM",
        "2:00 PM - 4:00 PM",
        "4:00 PM - 6:00 PM"
      ];

      const slotMap = {};
      bookings.forEach(b => {
        if (b.details.time) {
          slotMap[b.details.time] = b.status;
        }
      });

      const slots = allSlots.map((time, i) => ({
        id: i + 1,
        time,
        status: slotMap[time] || 'available'
      }));

      return res.json({ type, itemId, slots });
    }

    res.status(400).json({ error: 'Invalid type' });
  } catch (err) {
    console.error('Availability error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
