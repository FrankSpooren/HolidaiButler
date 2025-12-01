/**
 * HolidaiButler Platform Core
 * Central Integration Hub - Main Entry Point
 */

// IMPORTANT: Load environment variables FIRST, before any other imports
// This ensures all modules have access to env vars when they initialize
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Now import all other modules (they will have access to env vars)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import publicPOIRoutes from './routes/publicPOI.js';
import chatRoutes from './routes/chat.js';
import holibotRoutes from './routes/holibot.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import prometheusMiddleware, { metricsEndpoint } from './middleware/prometheus.js';
import correlationIdMiddleware from './middleware/correlationId.js';
import metricsService from './services/metrics.js';

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

    // Metrics & Observability
    metricsService.startPeriodicUpdates();
    logger.info('✅ Prometheus metrics collection started');

    logger.info('✅ Platform Core initialized successfully');
  } catch (error) {
    logger.error('❌ Platform initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('⚠️ Running in degraded mode without database - development only');
    }
  }
}

/**
 * Middleware Configuration
 */
// ENTERPRISE: Correlation ID must be first for distributed tracing
app.use(correlationIdMiddleware());

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);
app.use(prometheusMiddleware()); // ENTERPRISE: Prometheus metrics collection

/**
 * Routes
 */
// Prometheus metrics endpoint (before other routes for performance)
app.get('/metrics', metricsEndpoint);

app.use('/health', healthRoutes);
app.use('/api/v1/integration', integrationRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/poi-classification', poiClassificationRoutes);
app.use('/api/v1/poi-discovery', poiDiscoveryRoutes);
app.use('/api/v1/pois', publicPOIRoutes); // Public POI endpoints (no auth)
app.use('/api/v1/chat', chatRoutes); // HoliBot Chat API
app.use('/api/v1/holibot', holibotRoutes); // HoliBot Widget API
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
    const envDisplay = (process.env.NODE_ENV || 'development').toUpperCase().padEnd(42);
    const portDisplay = `http://localhost:${PORT}`.padEnd(28);
    logger.info(`
    ╔═══════════════════════════════════════════════════════════╗
    ║   🏝️  HolidaiButler Platform Core                        ║
    ║   Central Integration Hub                                ║
    ╠═══════════════════════════════════════════════════════════╣
    ║   Environment: ${envDisplay}║
    ║   API Gateway: ${portDisplay}║
    ║   Status: RUNNING                                        ║
    ╚═══════════════════════════════════════════════════════════╝
    `);
  });
});

export default app;
