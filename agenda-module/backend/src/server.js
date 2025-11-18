require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const eventRoutes = require('./routes/eventRoutes');
const errorHandler = require('./middleware/errorHandler');
const dailyEventUpdate = require('./automation/dailyEventUpdate');

/**
 * Agenda Module Server
 * Port: 5003 (to avoid conflicts with other modules)
 */

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'HolidaiButler Agenda Module',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/agenda', eventRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Initialize database and automation
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize daily automation
    dailyEventUpdate.initialize();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Agenda Module server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📅 API endpoints: http://localhost:${PORT}/api/agenda`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
