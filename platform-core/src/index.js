/**
 * HolidaiButler Platform Core
 * Central Integration Hub - Main Entry Point
 * Last deployment trigger: 2026-01-19 17:15 - HoliBot Sync Agent CloudClient fix
 */

// IMPORTANT: Load environment variables FIRST, before any other imports
// This ensures all modules have access to env vars when they initialize
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Sentry Error Monitoring - Initialize early to catch all errors
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 1.0,
  });
  console.log('Sentry initialized for error monitoring');
}

// Now import all other modules (they will have access to env vars)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import logger from './utils/logger.js';
import { initializeDatabase } from './config/database.js';
import { initializeEventBus } from './services/eventBus.js';
import { initializeAutomation } from './automation/index.js';
import { initializeOrchestrator, shutdownOrchestrator } from './services/orchestrator/index.js';
import apiGateway from './gateway/index.js';
import healthRoutes from './routes/health.js';
import integrationRoutes from './routes/integration.js';
import workflowRoutes from './routes/workflows.js';
import poiClassificationRoutes from './routes/poiClassification.js';
import poiDiscoveryRoutes from './routes/poiDiscovery.js';
import publicPOIRoutes from './routes/publicPOI.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import holibotRoutes from './routes/holibot.js';
import onboardingRoutes from './routes/onboarding.js';
import agendaRoutes from './routes/agenda.js';
import consentRoutes from './routes/consent.js';
import imageRefreshRoutes from './routes/imageRefresh.js';
import imageResizeRoutes from './routes/imageResize.js';
import adminPortalRoutes from './routes/adminPortal.js';
import User from './models/User.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import rateLimit from 'express-rate-limit';
import { mysqlSequelize } from './config/database.js';
import prometheusMiddleware, { metricsEndpoint } from './middleware/prometheus.js';
import correlationIdMiddleware from './middleware/correlationId.js';
import metricsService from './services/metrics.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for correct IP detection behind Apache/Nginx reverse proxy
// Required for express-rate-limit to work correctly
app.set('trust proxy', 1);

/**
 * Initialize Platform Core
 */
async function initializePlatform() {
  try {
    logger.info('🚀 Starting HolidaiButler Platform Core...');

    // Database connections
    await initializeDatabase();
    logger.info('✅ Database connections established');

    // Sync User model (for customer portal authentication)
    try {
      await User.sync({ alter: process.env.NODE_ENV === 'development' });
      logger.info('✅ User model synchronized');
    } catch (syncError) {
      logger.warn('⚠️ User model sync failed (may need manual setup):', syncError.message);
    }

    // Event Bus
    await initializeEventBus();
    logger.info('✅ Event Bus initialized');

    // Automation & Workflows
    if (process.env.ENABLE_CRON_JOBS === 'true') {
      await initializeAutomation();
      logger.info('✅ Automation workflows started');
    }

    // Orchestrator Agent (BullMQ scheduler + workers)
    try {
      await initializeOrchestrator();
      logger.info('✅ Orchestrator Agent started');
    } catch (orchError) {
      logger.warn('⚠️ Orchestrator initialization failed:', orchError.message);
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

// PERFORMANCE: Enable gzip compression for responses (50-70% size reduction)
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress for server-sent events or if client doesn't support
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
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
app.use('/api/auth', authRoutes); // Customer Portal Authentication (legacy)
app.use('/api/v1/auth', authRoutes); // Customer Portal Authentication (v1)
app.use('/api/v1/integration', integrationRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/poi-classification', poiClassificationRoutes);
app.use('/api/v1/poi-discovery', poiDiscoveryRoutes);
app.use('/api/v1/pois', publicPOIRoutes); // Public POI endpoints (no auth)
app.use('/api/v1/chat', chatRoutes); // HoliBot Chat API
app.use('/api/v1/holibot', holibotRoutes); // HoliBot Widget API
app.use('/api/v1/onboarding', onboardingRoutes); // User Onboarding Flow
app.use('/api/v1/agenda', agendaRoutes); // Agenda - Events & Calendar
app.use('/api/v1/consent', consentRoutes); // User Privacy Consent Management
app.use('/api/consent', consentRoutes); // Legacy route (no v1)
app.use('/api/admin/images/refresh', imageRefreshRoutes); // POI Image Refresh (Admin)
app.use('/api/v1/img', imageResizeRoutes); // Image resize proxy (Fase II-B.4)
app.use('/api/v1/admin-portal', adminPortalRoutes); // Admin Portal (Fase 8C-0)

// Static file serving for branding assets (logo uploads)
const brandingDir = process.env.NODE_ENV === 'production'
  ? '/var/www/api.holidaibutler.com/platform-core/public/branding'
  : path.resolve(__dirname, '../public/branding');
app.use('/branding', express.static(brandingDir));

// Pageview tracking — public, fire-and-forget (Fase 9B)
const trackRateLimit = rateLimit({ windowMs: 60 * 1000, max: 100, standardHeaders: false, legacyHeaders: false });
app.post('/api/v1/track', trackRateLimit, (req, res) => {
  res.status(204).end();
  const { destination, page_type, url, poi_id } = req.body || {};
  const validTypes = ['home', 'poi_list', 'poi_detail', 'chatbot', 'search', 'other'];
  if (!destination || !validTypes.includes(page_type)) return;
  const destId = destination === 'texel' ? 2 : destination === 'calpe' ? 1 : null;
  if (!destId) return;
  mysqlSequelize.query(
    `INSERT INTO page_views (destination_id, page_type, page_url, poi_id, session_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
    { replacements: [destId, page_type, (url || '').substring(0, 500), poi_id || null, null] }
  ).catch(() => {});
});

app.use('/api/v1', apiGateway); // API Gateway for all modules

/**
 * Error Handling
 */
app.use(errorHandler);

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', async () => {
  await shutdownOrchestrator();
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
// Workflow trigger 20260117-153411
