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

// OpenTelemetry tracing - initialize after env vars, before other imports
import './observability/tracing.js';

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
import { createPublicCollectionRouter } from "./routes/mediaCollectionRoutes.js";
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import holibotRoutes from './routes/holibot.js';
import onboardingRoutes from './routes/onboarding.js';
import agendaRoutes from './routes/agenda.js';
import consentRoutes from './routes/consent.js';
import imageRefreshRoutes from './routes/imageRefresh.js';
import imageResizeRoutes from './routes/imageResize.js';
import adminPortalRoutes from './routes/adminPortal.js';
import paymentRoutes from './routes/payment.js';
import ticketingRoutes from './routes/ticketing.js';
import reservationRoutes from './routes/reservations.js';
import pagesRoutes from './routes/pages.js';
import a2aRoutes from './routes/a2a.js';
import { registerFase16Skills } from './a2a/skills.js';
import { registerFase17ASkills } from './a2a/fase17a_skills.js';
import { registerFase17BSkills } from './a2a/fase17b_skills.js';
import { registerFase17CSkills } from './a2a/fase17c_skills.js';
import { registerFase17DSkills } from './a2a/fase17d_skills.js';
import { registerFase17ESkills } from './a2a/fase17e_skills.js';
import { registerFase17FSkills } from './a2a/fase17f_skills.js';
// enterpriseSkills.js loaded dynamically below (after registerFase calls)
// Fase 18.A — Per-agent dedicated skills (E-categorie)
import './services/agents/ownerInterfaceAgent/skills/sendSecurityAlert.js';
import './services/agents/ownerInterfaceAgent/skills/sendFinancialAlert.js';
import './services/agents/ownerInterfaceAgent/skills/sendBudgetAlert.js';
import './services/agents/ownerInterfaceAgent/skills/sendComplianceAlert.js';
import './services/agents/ownerInterfaceAgent/skills/sendSLAAlert.js';
// Fase 18.A — Per-agent dedicated skills (B-categorie)
import './services/agents/orchestrator/skills/coordinateRecovery.js';
import './services/agents/orchestrator/skills/restartCommand.js';
import './services/agents/financialMonitor/skills/notifyTransaction.js';
import './services/agents/financialMonitor/skills/inventoryImpact.js';
import './services/agents/personaliseerder/skills/weatherContext.js';
// Fase 18.A — Per-agent dedicated skills (C-categorie)
import './services/agents/boekhouder/skills/budgetReconciliation.js';
import './services/agents/gdpr/skills/gdprViolation.js';
import './services/agents/auditeur/skills/costComplianceCheck.js';
// Fase 18.A — Per-agent dedicated skills (D-categorie)
import './services/agents/contentRedacteur/skills/contentRefreshNeeded.js';
import './services/agents/seoMeester/skills/updateKeywords.js';
import './services/agents/contentRedacteur/skills/personalizeContent.js';
import './services/agents/contentRedacteur/skills/codeQualityFlag.js';
import './services/agents/beeldenmaker/skills/brandConsistencyCheck.js';
import './services/agents/publisher/skills/deprioritizeContent.js';
// Fase 18.A — Per-agent dedicated skills (E-leer categorie)
import './services/agents/strategyLayer/skills/reportExperimentResult.js';
import './services/agents/personaliseerder/skills/updateTrendProfiles.js';
// Fase 18.A — Per-agent dedicated skills (F-gap categorie)
import './services/agents/optimaliseerder/skills/journeyPattern.js';
import './services/agents/trendspotter/skills/recommendationMiss.js';
import './services/agents/trendspotter/skills/queryMiss.js';
import './services/agents/auditeur/skills/initCompliance.js';
import './services/agents/boekhouder/skills/initBudget.js';
import './services/agents/auditeur/skills/securityFinding.js';
import './services/agents/orchestrator/skills/lifecycleEvent.js';
// Fase 18.B — 29 nieuwe ecosystem flows (B.A-B.I)
import './services/agents/dataSync/skills/discoverPOIs.js';
import './services/agents/devLayer/skills/initBrandAssets.js';
import './services/agents/seoMeester/skills/initSEO.js';
import './services/agents/devLayer/skills/runSecurityBaseline.js';
import './services/agents/gdpr/skills/initGDPRDefaults.js';
import './services/agents/personaliseerder/skills/initBrandProfile.js';
import './services/agents/devLayer/skills/healthSecurityCheck.js';
import './services/agents/boekhouder/skills/checkCostSpike.js';
import './services/agents/dataSync/skills/proposePOIs.js';
import './services/agents/contentRedacteur/skills/prioritizeContent.js';
import './services/agents/beeldenmaker/skills/generateTrendVisuals.js';
import './services/agents/seoMeester/skills/captureKeywords.js';
import './services/agents/optimaliseerder/skills/suggestABTest.js';
import './services/agents/contentRedacteur/skills/scheduleUpdate.js';
import './services/agents/verfrisser/skills/triggerCheck.js';
import './services/agents/trendspotter/skills/signalDecline.js';
import './services/agents/auditeur/skills/logSecurityFinding.js';
import './services/agents/gdpr/skills/notifyGDPRRisk.js';
import './services/agents/devLayer/skills/correlateCodeFinding.js';
import './services/agents/ownerInterfaceAgent/skills/sendStockAlert.js';
import './services/agents/personaliseerder/skills/excludeOutOfStock.js';
import './services/agents/personaliseerder/skills/journeyContext.js';
import './services/agents/optimaliseerder/skills/dropoffOptimization.js';
import './services/agents/helpdeskmeester/skills/frustrationPattern.js';
import './services/agents/contentRedacteur/skills/contentGapDetected.js';
import './services/agents/personaliseerder/skills/adjustForFrustration.js';
import './services/agents/verfrisser/skills/staleInfoTicket.js';
import './services/agents/ownerInterfaceAgent/skills/orchestrationSummary.js';
import './services/agents/healthMonitor/skills/dependencyAwareCheck.js';
// Fase 19.B — Resilience & Failure-Handling Skills (RES1-RES5)
import './services/agents/maestro/skills/coordinateAnomalyRecovery.js';
import './services/agents/maestro/skills/circuitBreakerActivate.js';
import './services/agents/auditeur/skills/logHealthComplianceEvent.js';
import './services/agents/maestro/skills/securityHalt.js';
import './services/agents/maestro/skills/registerHeartbeat.js';
// Fase 19.C — Bidirectional Closure Skills (ACK1-ACK5)
import './services/agents/trendspotter/skills/discoveryComplete.js';
import './services/agents/contentRedacteur/skills/imageProcessingFailed.js';
import './services/agents/contentRedacteur/skills/seoValidationResult.js';
import './services/agents/reisleider/skills/profileUpdated.js';
import './services/agents/performanceWachter/skills/abTestStarted.js';
// Fase 19.D — Cross-Domain & Meta-Flows (CD1-CD10)
import './a2a/cd1Wrappers.js';
import './services/agents/leermeester/skills/registerWorkflowOutcome.js';
import './services/agents/inspecteur/skills/codeComplianceCheck.js';
import './services/agents/bewaker/skills/securityComplianceLink.js';
import './services/agents/maestro/skills/budgetThresholdReached.js';
import './services/agents/boekhouder/skills/revenueImpact.js';
import './services/agents/helpdeskmeester/skills/conversationEscalation.js';
import './services/agents/auditeur/skills/vectorAccessLog.js';
import './services/agents/auditeur/skills/staleContentReported.js';
import './services/agents/auditeur/skills/wcagComplianceFinding.js';
import contactRoutes from './routes/contact.js';
import newsletterRoutes from './routes/newsletter.js';
import blogRoutes from './routes/blogs.js';
import searchRoutes from './routes/search.js';
import relatedRoutes from './routes/related.js';
import itineraryRoutes from './routes/itinerary.js';
import TEMPLATE_DEFAULTS from './services/templates/templateDefaults.js';
import poiImagesRoutes from "./routes/poiImages.js";
import monitoringRoutes from "./routes/monitoring.js";
import { initializeCircuitBreakers } from './services/circuitBreakerInit.js';
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

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
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

// Skip JSON parsing for payment webhook (needs raw body for HMAC verification)
app.use((req, res, next) => {
  if (req.path === '/api/v1/payments/webhook') return next();
  express.json({ limit: '10mb' })(req, res, next);
});
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
app.use("/api/v1/poi-images", poiImagesRoutes);
app.use("/api/v1/monitoring", monitoringRoutes);
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
app.use('/api/v1/payments', paymentRoutes); // Payment Engine (Fase III-A)
app.use('/api/v1/tickets', ticketingRoutes); // Ticketing Module (Fase III-B)
app.use('/api/v1/reservations', reservationRoutes); // Reservation Module (Fase III-C)
app.use('/api/v1/pages', pagesRoutes);
app.use(a2aRoutes); // A2A v1.2 discovery (/.well-known/agents + /a2a/agents/:id/card)
registerFase16Skills(); // A2A skill handlers for inter-agent communication
registerFase17ASkills(); // Fase 17.A: Owner Communicatie flows (E1-E8)
registerFase17BSkills(); // Fase 17.B: Operationele Intelligentie flows (B1-B14)
registerFase17CSkills(); // Fase 17.C: Cost & Compliance flows (C1-C10)
registerFase17DSkills(); // Fase 17.D: Content Kwaliteitsketen (A1-A16)
registerFase17ESkills(); // Fase 17.E: Leer- & Optimalisatielus (D1-D12)
registerFase17FSkills(); // Fase 17.F: Gap-fix flows (11)
await import('./a2a/enterpriseSkills.js'); // Fase 20.B: 46 enterprise skills with OTel flow.id spans
app.use('/api/v1/contact', contactRoutes); // Contact Form (Fase V.6)
app.use('/api/v1/newsletter', newsletterRoutes); // Newsletter Subscribe (Fase V.6)
app.use('/api/v1/blogs', blogRoutes); // Public Blog API (Content Studio blogs)
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/related', relatedRoutes);
app.use('/api/v1/itinerary', itineraryRoutes);
// Template defaults for Page Editor (VII-E3)
app.get('/api/v1/admin-portal/templates', async (req, res) => {
  try {
    const TEMPLATES = (await import('./services/templates/templateDefaults.js')).default;
    const templates = Object.entries(TEMPLATES).map(([key, t]) => ({
      template_type: key,
      name: t.name,
      description: t.description,
      category: t.category,
      url_pattern: t.url_pattern,
      required_blocks: t.required_blocks,
      recommended_blocks: t.recommended_blocks,
      block_count: t.default_layout?.blocks?.length || 0,
      schema_type: t.schema_type,
    }));
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create page from template (VII-E3)
app.post('/api/v1/admin-portal/pages/from-template', async (req, res) => {
  try {
    const { template_type, destination_id, slug, title_nl, title_en } = req.body;
    if (!template_type || !destination_id || !slug) {
      return res.status(400).json({ error: 'template_type, destination_id, slug required' });
    }
    const TEMPLATES = (await import('./services/templates/templateDefaults.js')).default;
    const template = TEMPLATES[template_type];
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const { mysqlSequelize } = await import('./config/database.js');
    const { QueryTypes } = (await import('sequelize')).default;

    const layout = JSON.stringify(template.default_layout || { blocks: [] });
    await mysqlSequelize.query(
      `INSERT INTO pages (destination_id, slug, title_nl, title_en, layout, status, template_type)
       VALUES (:destId, :slug, :titleNl, :titleEn, :layout, 'draft', :tmpl)`,
      { replacements: { destId: destination_id, slug, titleNl: title_nl || '', titleEn: title_en || '', layout, tmpl: template_type }, type: QueryTypes.INSERT }
    );

    res.json({ success: true, message: 'Page created from template', template_type, slug });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}); // Itinerary OSRM routing (VII-E2 B2) // Related Items (VII-E2 A4) // Unified Search (VII-E2 A1)
app.use("/api/v1/public/media-collections", createPublicCollectionRouter()); // Public collection sharing (ML-1.4)

// OAuth helper — public base URL for callbacks (behind Apache reverse proxy req.get('host') returns localhost)
function getOAuthBaseUrl() {
  return process.env.OAUTH_BASE_URL || 'https://api.holidaibutler.com';
}

// Extract destination_id from OAuth state (format: hex16_destId)
function parseOAuthState(state) {
  if (!state) return { nonce: state, destinationId: 1 };
  const parts = state.split('_');
  if (parts.length === 2 && !isNaN(parts[1])) {
    return { nonce: parts[0], destinationId: Number(parts[1]) };
  }
  return { nonce: state, destinationId: 1 };
}

// LinkedIn OAuth Callback (Fase C — Content Publishing)
app.get('/api/v1/oauth/linkedin/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    if (error) return res.status(400).send(`LinkedIn OAuth error: ${error} — ${error_description || 'Geen details'}`);
    if (!code) return res.status(400).send(`Missing authorization code. Query params: ${JSON.stringify(req.query)}`);
    const { destinationId } = parseOAuthState(state);
    const LinkedInClient = (await import('./services/agents/publisher/clients/linkedinClient.js')).default;
    const redirectUri = `${getOAuthBaseUrl()}/api/v1/oauth/linkedin/callback`;
    const tokenData = await LinkedInClient.exchangeCodeForToken(code, redirectUri);
    const SocialAccount = (await import('./models/SocialAccount.js')).default;
    const encrypted = SocialAccount.encryptToken(tokenData.access_token);
    const refreshEncrypted = tokenData.refresh_token ? SocialAccount.encryptToken(tokenData.refresh_token) : null;
    await mysqlSequelize.query(
      `UPDATE social_accounts SET access_token_encrypted = :token, refresh_token_encrypted = :refresh, token_expires_at = :expires, status = 'active', updated_at = NOW()
       WHERE platform = 'linkedin' AND destination_id = :destId`,
      { replacements: { token: encrypted, refresh: refreshEncrypted, expires: tokenData.expires_at || null, destId: destinationId } }
    );
    res.send('<html><body><h2>LinkedIn gekoppeld!</h2><p>Je kunt dit venster sluiten.</p><script>window.close();</script></body></html>');
  } catch (error) {
    logger.error('[OAuth] LinkedIn callback error:', error);
    res.status(500).send('LinkedIn koppeling mislukt: ' + error.message);
  }
});

// Pinterest OAuth Callback (Fase C — Content Publishing)
app.get('/api/v1/oauth/pinterest/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');
    const { destinationId } = parseOAuthState(state);
    const redirectUri = `${getOAuthBaseUrl()}/api/v1/oauth/pinterest/callback`;
    const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(`Pinterest token exchange failed: ${data.message || data.error || response.statusText}`);
    }
    const SocialAccount = (await import('./models/SocialAccount.js')).default;
    const encrypted = SocialAccount.encryptToken(data.access_token);
    const refreshEncrypted = data.refresh_token ? SocialAccount.encryptToken(data.refresh_token) : null;
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString().slice(0, 19).replace('T', ' ') : null;
    await mysqlSequelize.query(
      `UPDATE social_accounts SET access_token_encrypted = :token, refresh_token_encrypted = :refresh, token_expires_at = :expires, status = 'active', updated_at = NOW()
       WHERE platform = 'pinterest' AND destination_id = :destId`,
      { replacements: { token: encrypted, refresh: refreshEncrypted, expires: expiresAt, destId: destinationId } }
    );
    res.send('<html><body><h2>Pinterest gekoppeld!</h2><p>Je kunt dit venster sluiten.</p><script>window.close();</script></body></html>');
  } catch (error) {
    logger.error('[OAuth] Pinterest callback error:', error);
    res.status(500).send('Pinterest koppeling mislukt: ' + error.message);
  }
});

// YouTube/Google OAuth Callback (Fase C — Content Publishing)
app.get('/api/v1/oauth/youtube/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');
    const { destinationId } = parseOAuthState(state);
    const redirectUri = `${getOAuthBaseUrl()}/api/v1/oauth/youtube/callback`;
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code, redirect_uri: redirectUri,
        client_id: process.env.YOUTUBE_CLIENT_ID, client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(`YouTube token exchange failed: ${data.error_description || data.error || response.statusText}`);
    }
    const SocialAccount = (await import('./models/SocialAccount.js')).default;
    const encrypted = SocialAccount.encryptToken(data.access_token);
    const refreshEncrypted = data.refresh_token ? SocialAccount.encryptToken(data.refresh_token) : null;
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString().slice(0, 19).replace('T', ' ') : null;
    await mysqlSequelize.query(
      `UPDATE social_accounts SET access_token_encrypted = :token, refresh_token_encrypted = :refresh, token_expires_at = :expires, status = 'active', updated_at = NOW()
       WHERE platform = 'youtube' AND destination_id = :destId`,
      { replacements: { token: encrypted, refresh: refreshEncrypted, expires: expiresAt, destId: destinationId } }
    );
    res.send('<html><body><h2>YouTube gekoppeld!</h2><p>Je kunt dit venster sluiten.</p><script>window.close();</script></body></html>');
  } catch (error) {
    logger.error('[OAuth] YouTube callback error:', error);
    res.status(500).send('YouTube koppeling mislukt: ' + error.message);
  }
});

// Static file serving — OUTSIDE platform-core/ to survive CI/CD deployments
const STORAGE_ROOT = process.env.STORAGE_ROOT || '/var/www/api.holidaibutler.com/storage';
app.use('/branding', express.static(path.join(STORAGE_ROOT, 'branding')));
app.use('/media-files', express.static(path.join(STORAGE_ROOT, 'media'), { maxAge: '24h', etag: true, lastModified: true }));
app.use('/block-images', express.static(path.join(STORAGE_ROOT, 'block-images')));

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
  // Initialize circuit breakers for monitoring
  try { initializeCircuitBreakers(); } catch(e) { console.warn("[Init] Circuit breaker init:", e.message); }

  const server = app.listen(PORT, () => {
  server.timeout = 300000; // 5 min (video uploads)
  server.keepAliveTimeout = 65000;
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
