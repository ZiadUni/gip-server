// routes/venues.js
// Staff-only venue management: view, add, delete

const express = require('express');
const router = express.Router();
const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { updateVenue } = require('../controllers/venueController');

router.get('/venues', async (req, res) => {
  try {
    const venues = await Venue.find().sort({ date: 1 });
    const bookings = await Booking.find({ type: 'venue', status: 'confirmed' });

    const updatedVenues = venues.map(venue => {
      const allSlots = venue.details?.slots || [];
      const totalSlots = allSlots.length;

      const venueId = `${venue.name}__${venue.date}`;
      const venueBookings = bookings.filter(b => b.itemId === venueId);

      const bookedSlotTimes = new Set(venueBookings.flatMap(b =>
        Array.isArray(b.details?.slots) ? b.details.slots : [b.details?.time]
      ));

      const isFullyBooked = bookedSlotTimes.size >= totalSlots;

      return {
        ...venue.toObject(),
        status: isFullyBooked ? "Booked" : "Available"
      };
    });

    console.log(`[GET] /venues → Found ${updatedVenues.length} venues`);

    if (!updatedVenues.length) {
      console.warn('⚠️ No venues found in DB. Returning fallback test venue.');
      return res.json([
        {
          _id: "dummy123",
          name: "Test Auditorium",
          date: "2025-12-01",
          capacity: 150,
          price: 300,
          image: "https://via.placeholder.com/600x400?text=Test+Venue",
          availability: "Available",
          status: "Available"
        }
      ]);
    }

    res.json(updatedVenues);
  } catch (err) {
    console.error('Venue status update error:', err);
    res.status(500).json({ error: res.__('venues.loadFail') });
  }
});

router.post('/venues', verifyToken, requireRole('staff'), async (req, res) => {
  const { name, date, capacity, availability, price, image } = req.body;

  if (!name || !date) {
    return res.status(400).json({ error: res.__('venues.missingData') });
  }

  const defaultSlots = [
    "8:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM"
  ];

  try {
    const venue = new Venue({
      name,
      date,
      capacity,
      availability,
      price,
      image,
      status: 'Available',
      details: { slots: defaultSlots }
    });

    await venue.save();
    res.status(201).json({ message: res.__('venues.venueAdded'), venue });
  } catch (err) {
    res.status(500).json({ error: res.__('venues.venueAddFailed') });
  }
});

router.delete('/venues/:id', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    await Venue.findByIdAndDelete(req.params.id);
    res.json({ message: res.__('venues.venueDeleted') });
  } catch (err) {
    res.status(500).json({ error: res.__('venues.venueDeleteFailed') }); 
  }
});

router.patch('/venues/:id', verifyToken, requireRole('staff'), updateVenue);

module.exports = router;
