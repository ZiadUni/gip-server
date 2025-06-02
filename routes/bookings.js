// bookings.js - Handles event/venue booking and cancellation

const express = require('express');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Venue = require('../models/Venue');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.patch('/bookings/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ error: res.__('bookings.notFound') });

    if (req.body.status === 'confirmed') {
      booking.status = 'confirmed';
      booking.expiresAt = null;
      await booking.save();
      return res.json({ message: res.__('bookings.bookingConfirm'), booking });
    }

    return res.status(400).json({ error: res.__('bookings.invalidUpdate') });
  } catch (err) {
    console.error('Booking update error:', err);
    res.status(500).json({ error: res.__('bookings.failedUpdateBooking') });
  }
});

router.post('/bookings', verifyToken, async (req, res) => {
  const { type, itemId, details } = req.body;

  if (!type || !itemId || !details) {
    return res.status(400).json({ error: res.__('bookings.missingDetails') });
  }

  if (type === 'venue' && req.user.role !== 'organizer' && req.user.role !== 'staff') {
    return res.status(403).json({ error: res.__('bookings.missingPerms') });
  }

  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);

    if (type === 'venue' && Array.isArray(details.slots)) {
      const bookings = [];

      for (const slotTime of details.slots) {
        const composedItemId = `${details.name}__${details.date}`;

        const existing = await Booking.findOne({
          user: req.user.id,
          itemId: composedItemId,
          status: { $ne: 'cancelled' },
          createdAt: { $gte: cutoff },
          'details.time': slotTime
        });

        if (existing) {
          console.warn(`[Duplicate Blocked] User ${req.user.id} already has booking for ${slotTime}`);
          continue;
        }

        const booking = new Booking({
          user: req.user.id,
          type,
          itemId: composedItemId,
          venueRef: req.body.venueId,
          details: {
            ...details,
            time: slotTime
          },
          status: 'pending',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        await booking.save();
        bookings.push(booking);
      }

      return res.status(201).json({ message: res.__('bookings.successfulBooking'), bookings });
    }

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
      console.warn(`[Duplicate Blocked] User: ${req.user.id} already reserved ${itemId}`);
      return res.status(409).json({ error: res.__('bookings.alreadyReserved') });
    }

    const booking = new Booking({
      user: req.user.id,
      type,
      itemId,
      venueRef: type === 'venue' ? req.body.venueId : undefined,
      details,
      status: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    await booking.save();
    res.status(201).json({ message: res.__('bookings.pendingSaved'), booking });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: res.__('bookings.serverError') });
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
    res.status(500).json({ error: res.__('bookings.failedLoadBookings') });
  }
});

router.get('/events/public', async (req, res) => {
  try {
    const bookings = await Booking.find({
      type: 'venue',
      status: 'confirmed',
      'details.event': { $exists: true }
    }).sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('Public event fetch error:', err);
    res.status(500).json({ error: res.__('bookings.failedLoadEvents') });
  }
});


router.delete('/bookings/:id', verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'staff' || req.user.role === 'admin';

    
    const booking = await Booking.findOne(
      isAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user.id }
    );

    if (!booking) {
      return res.status(404).json({ error: res.__('bookings.notFound') });
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
        await Venue.findOneAndUpdate(
          { name: booking.details.name, date: booking.details.date },
          { status: 'Available' }
        );
      }

      const notifMatch = {
        itemId: booking.itemId,
        type: 'venue',
        status: 'pending',
        'details.time': booking.details.time
      };

      const foundNotif = await Notification.findOne(notifMatch);
      if (foundNotif) {
        foundNotif.status = 'sent';
        await foundNotif.save();
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

    res.json({ message: res.__('bookings.cancelledNotifications'), booking });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: res.__('bookings.cancelFail') });
  }
});

router.get('/admin/bookings', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('venueRef', 'name')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('Admin booking fetch error:', err);
    res.status(500).json({ error: res.__('bookings.failedLoadBookings') });
  }
});

module.exports = router;
