// cleanup.js – Run via Render Cron Job to cancel expired bookings and notify users

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');
const Notification = require('./models/Notification');
const Venue = require('./models/Venue');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('[CRON] Connected to MongoDB');

    const now = new Date();

    const expired = await Booking.find({
      status: 'pending',
      expiresAt: { $lte: now }
    });

    if (expired.length === 0) {
      console.log('[CRON] No expired bookings found.');
      return process.exit(0);
    }

    console.log(`[CRON] Found ${expired.length} expired bookings.`);

    for (const booking of expired) {
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

      const matching = await Notification.find({
        itemId: booking.itemId,
        type: booking.type,
        status: 'pending'
      });

      for (const n of matching) {
        n.status = 'sent';
        await n.save();
      }

      console.log(`[CRON] Cancelled booking ${booking._id} and notified ${matching.length} users.`);
    }

    console.log('[CRON] Cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('[CRON] Cleanup error:', err);
    process.exit(1);
  }
})();
