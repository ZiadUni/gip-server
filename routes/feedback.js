const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const verifyToken = require('../middleware/auth');

// POST /api/feedback
router.post('/feedback', verifyToken, async (req, res) => {
  const { bookingId, rating, comment } = req.body;

  if (!bookingId || !rating) {
    return res.status(400).json({ error: 'Booking and rating required' });
  }

  try {
    const booking = await Booking.findOne({ _id: bookingId, user: req.user.id });
    if (!booking) return res.status(403).json({ error: 'Invalid booking' });

    const feedback = new Feedback({
      user: req.user.id,
      booking: bookingId,
      rating,
      comment
    });

    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

module.exports = router;
