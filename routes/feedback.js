const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.post('/feedback', verifyToken, async (req, res) => {
  const { bookingId, rating, comment, feedbackType = 'rating' } = req.body;

  if (!bookingId || (feedbackType === 'rating' && !rating)) {
    return res.status(400).json({ error: res.__('feedback.requiredStuff') });
  }

  try {
    const booking = await Booking.findOne({
        _id: bookingId,
        user: req.user.id
        });

    if (!booking) return res.status(403).json({ error: res.__('feedback.invalidBooking') });

    const feedback = new Feedback({
      user: req.user.id,
      booking: bookingId,
      rating: feedbackType === 'rating' ? rating : undefined,
      comment,
      feedbackType
    });

    await feedback.save();
    res.status(201).json({ message: res.__('feedback.submitted'), feedback });
  } catch (err) {
    res.status(500).json({ error: res.__('feedback.failedSave') });
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
    res.status(500).json({ error: res.__('feedback.failedFetch') });
  }
});

router.delete('/feedback/:id', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ error: res.__('feedback.notFound') });
    res.json({ message: res.__('feedback.deleted') });
  } catch (err) {
    console.error('Feedback delete error:', err);
    res.status(500).json({ error: res.__('feedback.failedDelete') });
  }
});

router.patch('/feedback/:id/flag', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ error: res.__('feedback.notFound') });

    feedback.flagged = !feedback.flagged;
    await feedback.save();

    res.json({ message: res.__(`feedback.${feedback.flagged ? 'flagged' : 'unflagged'}`) });
  } catch (err) {
    console.error('Feedback flag error:', err);
    res.status(500).json({ error: res.__('feedback.failedFlag') });
  }
});

module.exports = router;
