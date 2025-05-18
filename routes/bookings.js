// bookings.js - Handles event/venue booking and cancellation

const express = require('express');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Venue = require('../models/Venue');
const verifyToken = require('../middleware/auth');

const router = express.Router();

router.patch('/bookings/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.body.status === 'confirmed') {
      booking.status = 'confirmed';
      booking.expiresAt = null;
      await booking.save();
      return res.json({ message: 'Booking confirmed', booking });
    }

    return res.status(400).json({ error: 'Invalid status update' });
  } catch (err) {
    console.error('Booking update error:', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

router.post('/bookings', verifyToken, async (req, res) => {
  const { type, itemId, details } = req.body;

  if (!type || !itemId || !details) {
    return res.status(400).json({ error: 'Missing booking details' });
  }

  if (type === 'venue' && req.user.role !== 'organizer' && req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Only organizers or staff can book venues' });
  }

  try {
    console.log(`[Booking Attempt] User: ${req.user.id}, Type: ${type}, Item: ${itemId}, Time: ${details.time}, Seat: ${details.seat}`);

    const cutoff = new Date(Date.now() - 15 * 60 * 1000);

    const existing = await Booking.findOne({
      user: req.user.id,
      itemId,
      status: { $ne: 'cancelled' },
      createdAt: { $gte: cutoff },
      ...(type === 'event'
        ? { 'details.seat': details.seat }
        : { 'details.time': details.time })
    });

    if (existing) {
      console.warn(`[Duplicate Blocked - Active Reservation] User: ${req.user.id} already reserved ${itemId}`);
      return res.status(409).json({ error: 'This slot or seat is still reserved. Try again shortly.' });
    }

    const booking = new Booking({
      user: req.user.id,
      type,
      itemId,
      venueRef: type === 'venue' ? itemId : undefined,
      details,
      status: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    await booking.save();
    res.status(201).json({ message: 'Pending booking saved', booking });
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

      if (Array.isArray(booking.details?.slots)) {
        for (const slotTime of booking.details.slots) {
          const matchFields = {
            itemId: booking.itemId,
            type: 'venue',
            status: 'pending',
            'details.time': slotTime
          };

          const found = await Notification.findOne(matchFields);

          if (found) {
            found.status = 'sent';
            await found.save();
          }
        }
      }
    } else {
      const matchFields = {
        itemId: booking.itemId,
        type: booking.type,
        status: 'pending'
      };

      if (booking.details?.seat) {
        matchFields['details.seat'] = booking.details.seat;
      }

      if (booking.details?.time) {
        matchFields['details.time'] = booking.details.time;
      }

      const matchingNotifications = await Notification.find(matchFields);

      for (const n of matchingNotifications) {
        n.status = 'sent';
        await n.save();
      }
    }

    res.json({ message: 'Booking cancelled and notifications triggered', booking });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
