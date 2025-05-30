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
    res.status(500).json({ error: res.__('users.failedFetch') });
  }
});

router.patch('/users/:id/role', verifyToken, requireRole('staff'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['visitor', 'organizer', 'staff'].includes(role)) {
    return res.status(400).json({ error: res.__('users.invalidRole') });
  }

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: res.__('users.user404') });

    user.role = role;
    user.organizerRequest = false;
    await user.save();

    res.json({ message: res.__('users.roleUpdateSuccess'), user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('User role update error:', err);
    res.status(500).json({ error: res.__('users.roleUpdateFail') });
  }
});

router.delete('/users/:id', verifyToken, requireRole('staff'), async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: res.__('users.user404') });

    res.json({ message: res.__('users.userDeleteSuccess') });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ error: res.__('users.userDeleteFail') });
  }
});

module.exports = router;
