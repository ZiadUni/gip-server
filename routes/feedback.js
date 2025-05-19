const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.post('/feedback', verifyToken, async (req, res) => {
  const { bookingId, rating, comment, feedbackType = 'rating' } = req.body;

  if (!bookingId || (feedbackType === 'rating' && !rating)) {
    return res.status(400).json({ error: 'Booking ID and rating (for rating feedback) are required.' });
  }

  try {
    const booking = await Booking.findOne({
    _id: bookingId,
    $or: [
        { user: req.user.id },
        { status: 'cancelled' }
    ]
    });
    if (!booking) return res.status(403).json({ error: 'Invalid booking' });

    const feedback = new Feedback({
      user: req.user.id,
      booking: bookingId,
      rating: feedbackType === 'rating' ? rating : undefined,
      comment,
      feedbackType
    });

    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

router.get('/feedback', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate({
        path: 'booking',
        populate: {
          path: 'venueRef',
          select: 'name'
        }
      });

    res.json(feedback);
  } catch (err) {
    console.error('Feedback fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

module.exports = router;
