const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Load environment variables from .env
dotenv.config();

// Import route modules
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes.js');
const placeRoutes = require('./routes/placeRoutes.js');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for frontend-backend communication
app.use(express.json()); // Parse incoming JSON requests

// Serve static images with caching
app.use('/images', express.static(path.join(__dirname, 'public', 'images'), {
  maxAge: '7d',
}));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/places', placeRoutes);

// Health check route
app.get('/ping', (req, res) => res.json({ ok: true }));

// MongoDB connection and server start
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });