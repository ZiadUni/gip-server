// bookings.js - Handles event/venue booking and cancellation

// POST /api/bookings → stores booking (requires JWT)
// GET /api/bookings → fetches current user's bookings
// DELETE /api/bookings/:id → cancels a booking + triggers notification checks

const express = require('express');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
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
      details,
      status: 'confirmed'
    });

    await booking.save();
    res.status(201).json({ message: 'Booking saved', booking });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error('Booking fetch error:', err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

router.delete('/bookings/:id', verifyToken, async (req, res) => {
  console.log('DELETE attempt for ID:', req.params.id);
  console.log('User ID from token:', req.user.id);

  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });

    if (!booking) {
      console.log('Booking not found or doesn’t belong to user');
      return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = 'cancelled';
    await booking.save();

    console.log('✅ Booking cancelled:', booking._id);
    console.log('➡️  Booking itemId:', booking.itemId);
    console.log('➡️  Booking type:', booking.type);

    const matchingNotifications = await Notification.find({
      itemId: booking.itemId,
      type: booking.type,
      status: 'pending'
    });

    console.log(`🔔 Found ${matchingNotifications.length} matching notification(s)`);

    for (const n of matchingNotifications) {
      console.log(`🔔 Updating notification for user ${n.user}`);
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
