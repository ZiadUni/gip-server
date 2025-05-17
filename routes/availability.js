// availability.js - Real-time availability logic

const express = require('express');
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const router = express.Router();

router.get('/availability/venue/:id', async (req, res) => {
  try {
    const [name, rawDate] = decodeURIComponent(req.params.id).split('__');
    const date = rawDate;
    const venue = await Venue.findOne({ name: new RegExp(`^${name}$`, 'i'), date });
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    const bookings = await Booking.find({ itemId: venue._id.toString(), status: 'confirmed' });

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
    const any = confirmedBookings[0];
    const capacity = parseInt(any?.details?.capacity || 24);

    const seats = Array.from({ length: capacity }).map((_, i) => {
      const seatId = i + 1;
      return {
        id: seatId.toString(),
        status: takenSeats.has(seatId.toString()) ? 'booked' : 'available'
      };
    });

    res.json({ seats });
  } catch (err) {
    console.error('Event seat availability error:', err);
    res.status(500).json({ error: 'Failed to load seats' });
  }
});

module.exports = router;
