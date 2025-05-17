// bookings.js - Handles event/venue booking and cancellation

const express = require('express');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Venue = require('../models/Venue');
const verifyToken = require('../middleware/auth');

const router = express.Router();

router.post('/bookings', verifyToken, async (req, res) => {
  const { type, itemId, details } = req.body;

  if (!type || !itemId || !details) {
    return res.status(400).json({ error: 'Missing booking details' });
  }

  if (type === 'venue' && req.user.role !== 'organizer' && req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Only organizers or staff can book venues' });
  }

  try {
    const booking = new Booking({
      user: req.user.id,
      type,
      itemId,
      venueRef: type === 'venue' ? itemId : undefined,
      details,
      status: 'confirmed'
    });

    await booking.save();

    if (type === 'venue') {
      const venue = await Venue.findById(itemId);
      const allSlots = venue.details?.slots?.length || 1;

      const relatedBookings = await Booking.find({
        itemId,
        status: 'confirmed',
        type: 'venue'
      });

      const bookedTimes = new Set(relatedBookings.flatMap(b => {
        if (Array.isArray(b.details?.slots)) return b.details.slots;
        if (typeof b.details?.time === 'string') return [b.details.time];
        return [];
      }));

      if (bookedTimes.size >= allSlots) {
        venue.status = 'Booked';
        await venue.save();
      }
    }

    res.status(201).json({ message: 'Booking saved', booking });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('venueRef', '_id')
      .sort({ createdAt: -1 });

    const filtered = bookings.filter(b => {
      if (b.type !== 'venue') return true;
      return b.venueRef !== null;
    });

    res.json(filtered);
  } catch (err) {
    console.error('Booking fetch error:', err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

router.delete('/bookings/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = 'cancelled';
    await booking.save();

    if (booking.type === 'venue') {
      const activeBookings = await Booking.find({
        itemId: booking.itemId,
        status: 'confirmed',
        type: 'venue'
      });

      if (activeBookings.length === 0) {
        await Venue.findByIdAndUpdate(booking.itemId, { status: 'Available' });
      }
    }

    const matchingNotifications = await Notification.find({
      itemId: booking.itemId,
      type: booking.type,
      status: 'pending'
    });

    for (const n of matchingNotifications) {
      n.status = 'sent';
      await n.save();
    }

    res.json({ message: 'Booking cancelled and notifications triggered', booking });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
