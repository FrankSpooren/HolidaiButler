/**
 * HolidaiButler Platform Core
 * Central Integration Hub - Main Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { initializeDatabase } from './config/database.js';
import { initializeEventBus } from './services/eventBus.js';
import { initializeAutomation } from './automation/index.js';
import apiGateway from './gateway/index.js';
import healthRoutes from './routes/health.js';
import integrationRoutes from './routes/integration.js';
import workflowRoutes from './routes/workflows.js';
import poiClassificationRoutes from './routes/poiClassification.js';
import poiDiscoveryRoutes from './routes/poiDiscovery.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Initialize Platform Core
 */
async function initializePlatform() {
  try {
    logger.info('🚀 Starting HolidaiButler Platform Core...');

    // Database connections
    await initializeDatabase();
    logger.info('✅ Database connections established');

    // Event Bus
    await initializeEventBus();
    logger.info('✅ Event Bus initialized');

    // Automation & Workflows
    if (process.env.ENABLE_CRON_JOBS === 'true') {
      await initializeAutomation();
      logger.info('✅ Automation workflows started');
    }

    logger.info('✅ Platform Core initialized successfully');
  } catch (error) {
    logger.error('❌ Platform initialization failed:', error);
    process.exit(1);
  }
}

/**
 * Middleware Configuration
 */
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

/**
 * Routes
 */
app.use('/health', healthRoutes);
app.use('/api/v1/integration', integrationRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/poi-classification', poiClassificationRoutes);
app.use('/api/v1/poi-discovery', poiDiscoveryRoutes);
app.use('/api/v1', apiGateway); // API Gateway for all modules

/**
 * Error Handling
 */
app.use(errorHandler);

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

/**
 * Start Server
 */
initializePlatform().then(() => {
  app.listen(PORT, () => {
    logger.info(`
    ╔═══════════════════════════════════════════════════════════╗
    ║   🏝️  HolidaiButler Platform Core                        ║
    ║   Central Integration Hub                                ║
    ╠═══════════════════════════════════════════════════════════╣
    ║   Environment: ${process.env.NODE_ENV?.toUpperCase().padEnd(42)}║
    ║   API Gateway: http://localhost:${PORT}${' '.repeat(22)}║
    ║   Status: RUNNING                                        ║
    ╚═══════════════════════════════════════════════════════════╝
    `);
  });
});

export default app;
