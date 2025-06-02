// tasks/cleanup.js – Cancels expired bookings and notifies users

const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Venue = require('../models/Venue');

const cleanupExpiredBookings = async () => {
  const now = new Date();

  try {
    const expired = await Booking.find({
      status: 'pending',
      expiresAt: { $lte: now }
    });

    if (expired.length === 0) {
      console.log('[CLEANUP] No expired bookings found.');
      return;
    }

    console.log(`[CLEANUP] Found ${expired.length} expired bookings.`);

    for (const booking of expired) {
      if (!booking.expiresAt || isNaN(new Date(booking.expiresAt))) {
        console.warn(`[CLEANUP] Skipping invalid booking ${booking._id} (missing or bad expiresAt)`);
        continue;
      }

      booking.status = 'cancelled';
      await booking.save();

      if (booking.type === 'venue') {
        const active = await Booking.find({
          itemId: booking.itemId,
          status: 'confirmed',
          type: 'venue'
        });

        if (active.length === 0) {
          await Venue.findByIdAndUpdate(booking.itemId, { status: 'Available' });
        }
      }

      const matches = await Notification.find({
        itemId: booking.itemId,
        type: booking.type,
        status: 'pending'
      });

      for (const n of matches) {
        n.status = 'sent';
        await n.save();
      }

      console.log(`[CLEANUP] Cancelled ${booking._id}, notified ${matches.length} users.`);
    }
  } catch (err) {
    console.error('[CLEANUP] Error during cleanup:', err);
  }
};

module.exports = cleanupExpiredBookings;
