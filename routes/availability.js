// availability.js - Real-time availability logic

// GET /api/availability/event/:itemId → returns 30-seat map
// GET /api/availability/venue/:itemId → returns 5 standard slots
// Seat/slot status is calculated based on confirmed bookings

const express = require('express');
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const router = express.Router();

router.get('/availability/venue/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    const bookings = await Booking.find({ itemId: req.params.id, status: 'confirmed' });

    const bookedTimes = new Set(bookings.flatMap(b =>
      Array.isArray(b.details?.slots) ? b.details.slots : [b.details?.time]
    ));

    const updatedSlots = (venue.details?.slots || []).map((slot, idx) => ({
      id: `slot${idx + 1}`,
      time: slot,
      status: bookedTimes.has(slot) ? 'booked' : 'available'
    }));

    res.json({ slots: updatedSlots });
  } catch (err) {
    console.error('Availability error:', err);
    res.status(500).json({ error: 'Failed to load availability' });
  }
});

router.get('/availability/event/:id', async (req, res) => {
  try {
    const eventId = decodeURIComponent(req.params.id);

    const confirmedBookings = await Booking.find({
      itemId: eventId,
      type: 'event',
      status: 'confirmed'
    });

    const takenSeats = new Set(confirmedBookings.map(b => b.details?.seat));

    const seats = Array.from({ length: 24 }).map((_, i) => {
      const seatId = String.fromCharCode(65 + Math.floor(i / 6)) + ((i % 6) + 1);
      return {
        id: seatId,
        status: takenSeats.has(seatId) ? 'booked' : 'available'
      };
    });

    res.json({ seats });
  } catch (err) {
    console.error('Event seat availability error:', err);
    res.status(500).json({ error: 'Failed to load seats' });
  }
});

module.exports = router;
