/**
 * OpenTelemetry Tracing Bootstrap
 * MUST be imported as the FIRST module in the application (after dotenv)
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': 'hb-platform-core',
    'service.version': process.env.APP_VERSION || 'unknown',
    'deployment.environment': process.env.NODE_ENV || 'development'
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false }
    })
  ]
});

sdk.start();
console.log('[otel] SDK started');

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('[otel] SDK shut down'))
    .catch(e => console.error('[otel] Shutdown error:', e))
    .finally(() => process.exit(0));
});

export default sdk;
