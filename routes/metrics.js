// metrics.js - Provides analytics data for admin dashboard

// GET /api/metrics-data?range=7d&type=venue
// Returns: tickets sold, revenue, top venue, venue usage,
// revenue trend over time, and ticket type breakdown

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.get('/metrics-data', verifyToken, requireRole('staff'), async (req, res) => {
  const { from, to, type = 'all', status = 'current', venue } = req.query;

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const query = {
    ...(fromDate && { createdAt: { $gte: fromDate } }),
    ...(toDate && { createdAt: { ...(fromDate ? { $gte: fromDate } : {}), $lte: toDate } }),
    ...(type !== 'all' && { type })
  };

  try {
    let bookings = await Booking.find(query).populate('venueRef', '_id');

    if (status === 'current') {
      bookings = bookings.filter(b =>
        (b.status === 'confirmed' || b.status === 'pending') &&
        (b.type !== 'venue' || b.venueRef !== null)
      );
    } else if (status === 'past') {
      bookings = bookings.filter(b =>
        b.status === 'cancelled' ||
        (b.type === 'venue' && b.venueRef === null)
      );
    }

    if (venue) {
      bookings = bookings.filter(b => {
        const name = b.details?.name || b.details?.venue || '';
        return name.toLowerCase() === venue.toLowerCase();
      });
    }

    const ticketsSold = bookings.length;

    const totalRevenue = bookings.reduce((sum, b) => {
      const price = b.details?.price || 0;
      return sum + parseFloat(price.toString().replace(/[^0-9.]/g, '') || 0);
    }, 0);

    const venueCounts = {};
    bookings.forEach(b => {
      const name = b.details?.name || b.details?.venue;
      if (name) venueCounts[name] = (venueCounts[name] || 0) + 1;
    });

    const topVenue = Object.entries(venueCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    const venueUsage = Object.entries(venueCounts).map(([name, count]) => ({
      name,
      bookings: count
    }));

    const ticketType = [
      { type: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length },
      { type: 'Pending', value: bookings.filter(b => b.status === 'pending').length },
      { type: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length }
    ];

    const revenueTrendMap = {};
    bookings.forEach(b => {
      const day = new Date(b.createdAt).toLocaleDateString();
      const price = parseFloat(b.details?.price?.replace(/[^0-9.]/g, '') || 0);
      revenueTrendMap[day] = (revenueTrendMap[day] || 0) + price;
    });

    const revenueTrend = Object.entries(revenueTrendMap)
      .map(([day, revenue]) => ({ day, revenue }))
      .sort((a, b) => new Date(a.day) - new Date(b.day));

    return res.json({
      data: {
        ticketsSold,
        totalRevenue,
        topVenue,
        venueUsage,
        revenueTrend,
        ticketType
      }
    });
  } catch (err) {
    console.error('Metrics error:', err);
    return res.status(500).json({ error: res.__('metrics.failedGenerate') });
  }
});

module.exports = router;
