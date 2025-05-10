// auth.js (routes)
// Provides POST /api/register and /api/login for user authentication

// Registration: Hashes password, stores user, returns token
// Login: Validates credentials, returns JWT + user object

const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// POST /api/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({ name, email, password: hashed });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('LOGIN ATTEMPT:', req.body);

  
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
  
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
  
      res.json({
        message: 'Login successful',
        token,
        user: { name: user.name, email: user.email }
      });
    } catch (err) {
            console.error('LOGIN ERROR:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

module.exports = router;
