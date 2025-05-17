// routes/venues.js
// Staff-only venue management: view, add, delete

const express = require('express');
const router = express.Router();
const Venue = require('../models/Venue');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.get('/venues', verifyToken, async (req, res) => {
  try {
    const venues = await Venue.find().sort({ date: 1 });
    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load venues' });
  }
});

router.post('/venues', verifyToken, requireRole('staff'), async (req, res) => {
  const { name, date, capacity, availability, price, image } = req.body;

  if (!name || !date) return res.status(400).json({ error: 'Missing venue data' });

  try {
    const venue = new Venue({ name, date, capacity, availability, price, image });
    await venue.save();
    res.status(201).json({ message: 'Venue added', venue });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add venue' });
  }
});

router.delete('/venues/:id', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    await Venue.findByIdAndDelete(req.params.id);
    res.json({ message: 'Venue deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete venue' });
  }
});

module.exports = router;
