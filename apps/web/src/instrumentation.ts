import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { getPostHogLogsEndpoint, getPostHogProjectToken } from './lib/posthog/server-config'

const token = getPostHogProjectToken()

export const loggerProvider = token
  ? new LoggerProvider({
      resource: resourceFromAttributes({ 'service.name': 'graspful-web' }),
      processors: [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({
            url: getPostHogLogsEndpoint(),
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

type HeaderMap =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined

function readHeader(headers: HeaderMap, name: string): string | undefined {
  if (!headers) return undefined
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? undefined
  }
  const value = (headers as Record<string, string | string[] | undefined>)[name]
  return Array.isArray(value) ? value.join('; ') : value
}

function getPostHogDistinctId(cookieHeader?: string): string | undefined {
  const match = cookieHeader?.match(/ph_phc_.*?_posthog=([^;]+)/)
  if (!match?.[1]) return undefined

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]))
    return typeof parsed?.distinct_id === 'string'
      ? parsed.distinct_id
      : undefined
  } catch {
    return undefined
  }
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'Unknown Next.js request error')
}

export const onRequestError = async (
  error: unknown,
  request: { headers?: HeaderMap; path?: string; method?: string } = {},
  context: Record<string, unknown> = {},
) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const errorObject = asError(error)
  loggerProvider?.getLogger('nextjs').emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: 'ERROR',
    body: `Next.js request error: ${errorObject.message}`,
    attributes: {
      source: 'nextjs-on-request-error',
      path: request.path,
      method: request.method,
      ...(typeof context.routeType === 'string' && { route_type: context.routeType }),
      ...(typeof context.routePath === 'string' && { route_path: context.routePath }),
      ...(typeof context.routerKind === 'string' && { router_kind: context.routerKind }),
      'error.type': errorObject.name,
      'error.message': errorObject.message,
      ...(errorObject.stack && { 'error.stack': errorObject.stack }),
    },
  })
  try {
    await loggerProvider?.forceFlush()
  } catch {
    // Logging should never block exception capture.
  }

  const { getServerPostHog } = await import('./lib/posthog/server')
  const posthog = getServerPostHog()
  if (!posthog) return

  const cookie = readHeader(request.headers, 'cookie')
  const distinctId = getPostHogDistinctId(cookie) || 'nextjs-server'

  posthog.captureException(errorObject, distinctId, {
    source: 'nextjs-on-request-error',
    path: request.path,
    method: request.method,
    route_type: context.routeType,
    route_path: context.routePath,
    router_kind: context.routerKind,
  })
}
