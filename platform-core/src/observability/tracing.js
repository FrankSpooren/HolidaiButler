/**
 * OpenTelemetry + Sentry Tracing Bootstrap (v5.2.0)
 *
 * MUST be imported as the FIRST module in the application (after dotenv).
 *
 * Architecture:
 *  - Sentry.init() runs first with skipOpenTelemetrySetup=true
 *  - Custom NodeSDK with dual span processors:
 *      BatchSpanProcessor(OTLPTraceExporter) -> otelcol-contrib -> Tempo
 *      SentrySpanProcessor                   -> Sentry.io (Performance Monitoring)
 *  - SentrySampler honours tracesSampleRate
 *  - SentryPropagator + SentryContextManager keep OTel context in sync with Sentry
 *  - nodeProfilingIntegration adds CPU/memory profiles at profilesSampleRate
 *  - ESM loader hooks registered manually via preloadOpenTelemetry()
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import {
  SentrySpanProcessor,
  SentrySampler,
  SentryPropagator,
  SentryAsyncLocalStorageContextManager,
} from '@sentry/opentelemetry';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';

// 0) Load .env BEFORE Sentry.init() — ESM imports are hoisted above index.js
//    dotenv.config(), so tracing.js must load env vars itself. Idempotent.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 1) Sentry init (only if DSN provided)
const sentryClient = process.env.SENTRY_DSN
  ? Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 1.0,
      profilesSampleRate: 0.1,
      integrations: [nodeProfilingIntegration()],
      skipOpenTelemetrySetup: true,
      registerEsmLoaderHooks: false,
    })
  : null;

if (sentryClient) {
  console.log('[sentry] Client initialized (profiling at 10% sample rate)');
}

// 2) OTLP exporter -> Tempo (via otelcol-contrib on localhost:4317)
const otlpExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
});

// 3) Build span processor array conditionally
const spanProcessors = [new BatchSpanProcessor(otlpExporter)];
if (sentryClient) {
  spanProcessors.push(new SentrySpanProcessor());
}

// 4) NodeSDK with dual export + Sentry context coordination (when client active)
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': 'hb-platform-core',
    'service.version': process.env.APP_VERSION || 'unknown',
    'deployment.environment': process.env.NODE_ENV || 'development',
  }),
  spanProcessors,
  sampler: sentryClient ? new SentrySampler(sentryClient) : undefined,
  contextManager: sentryClient ? new SentryAsyncLocalStorageContextManager() : undefined,
  textMapPropagator: sentryClient ? new SentryPropagator() : undefined,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
  ],
});

sdk.start();
console.log('[otel] SDK started');

// 5) Manual ESM loader hooks (Sentry registerEsmLoaderHooks=false -> we trigger it)
if (sentryClient) {
  Sentry.preloadOpenTelemetry();
}

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('[otel] SDK shut down'))
    .catch(e => console.error('[otel] Shutdown error:', e))
    .finally(() => process.exit(0));
});

export default sdk;
