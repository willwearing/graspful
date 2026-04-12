import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { logs } from '@opentelemetry/api-logs'
import { resourceFromAttributes } from '@opentelemetry/resources'

const token = process.env.NEXT_PUBLIC_POSTHOG_KEY
const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '')

export const loggerProvider = token
  ? new LoggerProvider({
      resource: resourceFromAttributes({ 'service.name': 'graspful-web' }),
      processors: [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({
            url: `${host}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
        ),
      ],
    })
  : null

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && loggerProvider) {
    logs.setGlobalLoggerProvider(loggerProvider)
  }
}
