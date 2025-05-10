// metrics.js - Provides analytics data for admin dashboard

// GET /api/metrics-data?range=7d&type=venue
// Returns: tickets sold, revenue, top venue, venue usage,
// revenue trend over time, and ticket type breakdown

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const verifyToken = require('../middleware/auth');

const parseDateRange = (range) => {
  const now = new Date();
  if (range === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return null;
};

router.get('/metrics-data', verifyToken, async (req, res) => {
  const { range = '7d', type = 'all' } = req.query;
  const dateFrom = parseDateRange(range);

  const query = {
    ...(dateFrom && { createdAt: { $gte: dateFrom } }),
    ...(type !== 'all' && { type })
  };

  try {
    const bookings = await Booking.find(query);

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

    const venueUsage = Object.entries(venueCounts).map(([name, count]) => ({ name, bookings: count }));

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
    return res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

module.exports = router;
