// models/Venue.js
// Represents venue slots available for booking

const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  name: String,
  date: String,
  capacity: Number,
  availability: String,
  status: { type: String, default: 'Available' },
  price: String,
  image: String,
  details: {
    slots: [String]
  }
});

module.exports = mongoose.model('Venue', venueSchema);
