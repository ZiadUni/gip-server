// notification.js - Handles notification subscriptions and alerting

// POST /api/notification → subscribe to slot alerts (stored in DB)
// GET /api/notification → fetch current user's triggered alerts
// PATCH /api/notification/:id/viewed → optional: mark as viewed

const express = require('express');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// POST /api/bookings - Save a new booking
router.post('/bookings', verifyToken, async (req, res) => {
  const { type, itemId, details } = req.body;

  if (!type || !itemId || !details) {
    return res.status(400).json({ error: 'Missing booking details' });
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

// GET /api/bookings - Get bookings for logged-in user
router.get('/bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error('Booking fetch error:', err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// DELETE /api/bookings/:id - Cancel a booking and trigger notifications
router.delete('/bookings/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.status = 'cancelled';
    await booking.save();

    // Notify any users subscribed to this item
    const notification = await Notification.find({
      itemId: booking.itemId,
      type: booking.type,
      status: 'pending'
    });

    for (const n of notification) {
      console.log(`🔔 Notify user ${n.user} — ${booking.itemId} is now available`);
      n.status = 'sent';
      await n.save();
    }

    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// POST /api/notifications — subscribe to seat or slot alerts
router.post('/notification', verifyToken, async (req, res) => {
    const { type, itemId, details } = req.body;
  
    if (!type || !itemId) {
      return res.status(400).json({ error: 'Missing type or itemId' });
    }
  
    try {
      
    const query = {
      user: req.user.id,
      type,
      itemId,
      status: 'pending'
    };
    if (details?.seat) {
      query['details.seat'] = details.seat;
    }
    if (details?.time) {
      query['details.time'] = details.time;
    }
    const existing = await Notification.findOne(query);
  
      if (existing) {
        return res.status(409).json({ message: 'Already subscribed for this item' });
      }
  
      const notification = new Notification({
        user: req.user.id,
        type,
        itemId,
        details
      });
  
      await notification.save();
      res.status(201).json({ message: 'Subscribed for availability notifications' });
    } catch (err) {
      console.error('Notification subscribe error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

// GET /api/notifications — fetch triggered notifications for current user
router.get('/notification', verifyToken, async (req, res) => {
    try {
      const notification = await Notification.find({
        user: req.user.id,
        status: 'sent'
      }).sort({ createdAt: -1 }).limit(10);
  
      res.json(notification);
    } catch (err) {
      console.error('Notification fetch error:', err);
      res.status(500).json({ error: 'Failed to load notifications' });
    }
  });

  // PATCH /api/notification/:id/viewed — optional: mark as viewed
router.patch('/notification/:id/viewed', verifyToken, async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, status: 'sent' },
      { $set: { status: 'viewed' } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found or already viewed' });
    }

    res.json({ message: 'Notification marked as viewed', notification: updated });
  } catch (err) {
    console.error('Notification mark viewed error:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});


module.exports = router;
