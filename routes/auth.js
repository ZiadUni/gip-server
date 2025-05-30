// auth.js (routes)
// Provides POST /api/register and /api/login for user authentication

// Registration: Hashes password, stores user, returns token
// Login: Validates credentials, returns JWT + user object

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, wantsToBeOrganizer } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: res.__('auth2.emailUsed') });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashed,
      role: 'visitor',
      organizerRequest: wantsToBeOrganizer || false
    });

    await user.save();

    res.status(201).json({ message: res.__('auth2.registerSuccess') });
  } catch (err) {
    res.status(500).json({ error: res.__('auth2.error1') });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('LOGIN ATTEMPT:', req.body);

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: res.__('auth2.badCreds') });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: res.__('auth2.badCreds') });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: res.__('auth2.loginSuccess'),
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        organizerRequest: user.organizerRequest
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: res.__('auth2.error1') });
  }
});

module.exports = router;
