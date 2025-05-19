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
        user: req.user.id
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

router.delete('/feedback/:id', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });
    res.json({ message: 'Feedback deleted' });
  } catch (err) {
    console.error('Feedback delete error:', err);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

router.patch('/feedback/:id/flag', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });

    feedback.flagged = !feedback.flagged;
    await feedback.save();

    res.json({ message: `Feedback ${feedback.flagged ? 'flagged' : 'unflagged'}` });
  } catch (err) {
    console.error('Feedback flag error:', err);
    res.status(500).json({ error: 'Failed to flag feedback' });
  }
});

module.exports = router;
