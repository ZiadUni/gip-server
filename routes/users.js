// Staff-only routes to manage user roles (approve organizer requests)

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.get('/users', verifyToken, requireRole('staff'), async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/role', verifyToken, requireRole('staff'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['visitor', 'organizer', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.role = role;
    user.organizerRequest = false;
    await user.save();

    res.json({ message: 'User role updated', user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('User role update error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.delete('/users/:id', verifyToken, requireRole('staff'), async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
