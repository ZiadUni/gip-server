// server.js - Main entry point for the Express server
// Connects to MongoDB, sets up middleware (CORS, JSON),
// imports all route files, and starts listening on port

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cron = require('node-cron');
const cleanupExpiredBookings = require('./tasks/cleanup');
const i18n = require('./i18n');

console.log('Loaded MONGO_URI:', process.env.MONGO_URI);

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = ['https://gip-frontend.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json());
app.use(i18n.init);

// Optional: Logging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const metricsRoutes = require('./routes/metrics');
app.use('/api', metricsRoutes);

const bookingRoutes = require('./routes/bookings');
app.use('/api', bookingRoutes);

const notificationRoutes = require('./routes/notification');
app.use('/api', notificationRoutes);

const availabilityRoutes = require('./routes/availability');
app.use('/api', availabilityRoutes);

const userRoutes = require('./routes/users');
app.use('/api', userRoutes);

const venueRoutes = require('./routes/venues');
app.use('/api', venueRoutes);

const feedbackRoutes = require('./routes/feedback');
app.use('/api', feedbackRoutes);

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

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

cron.schedule('* * * * *', async () => {
  console.log('[CRON] Running expired booking cleanup...');
  await cleanupExpiredBookings();
});
