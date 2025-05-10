// server.js - Main entry point for the Express server

// Connects to MongoDB, sets up middleware (CORS, JSON),
// imports all route files, and starts listening on port

// Routes:
// /api → auth, bookings, availability, notifications, metrics

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
console.log('Loaded MONGO_URI:', process.env.MONGO_URI);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

const metricsRoutes = require('./routes/metrics');
app.use('/api', metricsRoutes);

const bookingRoutes = require('./routes/bookings');
app.use('/api', bookingRoutes);

const notificationRoutes = require('./routes/notification');
app.use('/api', notificationRoutes);

const availabilityRoutes = require('./routes/availability');
app.use('/api', availabilityRoutes);

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
  
