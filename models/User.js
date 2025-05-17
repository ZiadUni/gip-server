// User.js - Mongoose schema for user accounts

// Stores: name, email, hashed password
// Used during login, registration, and token decoding

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['visitor', 'organizer', 'staff'],
    default: 'visitor'
  },
  organizerRequest: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('User', userSchema);
