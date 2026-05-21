const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connection
const pool = require('./db/index');

// Import all routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// cors() allows your frontend to talk to this backend
// express.json() allows your server to read JSON data sent from frontend
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://classroom-booking-system-one.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

// Routes
// Every auth endpoint starts with /api/auth
// Every room endpoint starts with /api/rooms
// Every booking endpoint starts with /api/bookings
// Every notification endpoint starts with /api/notifications
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Classroom Booking System API is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});