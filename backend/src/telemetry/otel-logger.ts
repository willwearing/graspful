import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { logs, Logger, SeverityNumber } from '@opentelemetry/api-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';

let sdk: NodeSDK | null = null;

export function initOtel() {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    console.log('POSTHOG_API_KEY not set — OpenTelemetry logging disabled');
    return;
  }

  const resource = resourceFromAttributes({
    'service.name': 'niche-audio-prep-backend',
  });

  const exporter = new OTLPLogExporter({
    url: `${host.replace(/\/$/, '')}/v1/logs`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  sdk = new NodeSDK({
    resource,
    logRecordProcessors: [new SimpleLogRecordProcessor(exporter)],
  });
  sdk.start();

  console.log('OpenTelemetry logging initialized');
}

export async function shutdownOtel() {
  if (sdk) {
    await sdk.shutdown();
  }
}

/**
 * Get a named logger instance. Returns a no-op compatible logger
 * when OTel is not initialized.
 */
export function getLogger(name: string): Logger {
  return logs.getLogger(name);
}

export { SeverityNumber };
