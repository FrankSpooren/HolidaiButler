/**
 * Health Check Routes
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
  };

  // Check MySQL
  try {
    await mysqlSequelize.authenticate();
    health.services.mysql = 'connected';
  } catch (error) {
    health.services.mysql = 'disconnected';
    health.status = 'unhealthy';
  }

  // Check MongoDB (optional - does not affect health status)
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.mongodb = 'connected';
    } else {
      health.services.mongodb = 'not configured';
      // MongoDB is optional, don't degrade health status
    }
  } catch (error) {
    health.services.mongodb = 'not configured';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/ready', (req, res) => {
  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
