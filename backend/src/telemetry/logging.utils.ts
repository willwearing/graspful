import { Logger, SeverityNumber } from '@opentelemetry/api-logs';
import type { AnyValue, LogAttributes } from '@opentelemetry/api-logs';

const SECRET_PATTERNS = [
  /bearer\s+[a-z0-9\-_.=]+/gi,
  /sk_(live|test)_[a-z0-9]+/gi,
  /pk_(live|test)_[a-z0-9]+/gi,
];

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'signature',
  'rawBody',
]);

export function emitLog(
  logger: Logger,
  name: string,
  severityNumber: SeverityNumber,
  severityText: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  body: string,
  attributes: LogAttributes = {},
) {
  const record = {
    ts: new Date().toISOString(),
    logger: name,
    severity: severityText,
    message: body,
    ...attributes,
  };

  const line = JSON.stringify(record);

  if (severityNumber >= SeverityNumber.ERROR) {
    console.error(line);
  } else if (severityNumber >= SeverityNumber.WARN) {
    console.warn(line);
  } else {
    console.log(line);
  }

  logger.emit({
    severityNumber,
    severityText,
    body,
    attributes: sanitizeAttributes(attributes),
  });
}

export function sanitizeAttributes(attributes: LogAttributes): LogAttributes {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [key, sanitizeValue(key, value)]),
  );
}

export function sanitizeValue(key: string, value: unknown, depth = 0): AnyValue {
  if (value == null) {
    return value;
  }

  if (SENSITIVE_KEYS.has(key)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return sanitizeString(value.length > 4000 ? `${value.slice(0, 4000)}...[truncated]` : value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    if (depth >= 3) {
      return `[Array(${value.length})]`;
    }
    return value.slice(0, 20).map((item) => sanitizeValue(key, item, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= 3) {
      return '[Object]';
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([childKey, childValue]) => [childKey, sanitizeValue(childKey, childValue, depth + 1)]),
    ) as LogAttributes;
  }

  return String(value);
}

export function summarizeBody(body: unknown): unknown {
  if (body == null) {
    return undefined;
  }

  if (typeof body === 'string') {
    return {
      type: 'string',
      length: body.length,
      preview: sanitizeString(body.slice(0, 200)),
    };
  }

  if (typeof body !== 'object') {
    return {
      type: typeof body,
      value: sanitizeValue('value', body),
    };
  }

  if (Array.isArray(body)) {
    return {
      type: 'array',
      length: body.length,
      sample: body.slice(0, 3).map((item) => sanitizeValue('item', item)),
    };
  }

  const objectBody = body as Record<string, unknown>;
  const answer = objectBody.answer;

  return {
    type: 'object',
    keys: Object.keys(objectBody).sort(),
    answerKind:
      answer == null ? undefined : Array.isArray(answer) ? 'array' : typeof answer,
    answerLength:
      typeof answer === 'string'
        ? answer.length
        : Array.isArray(answer)
          ? answer.length
          : undefined,
    answerValue: answer == null ? undefined : sanitizeValue('answer', answer),
  };
}

export function getBodySize(body: unknown, rawBody?: Buffer): number | undefined {
  if (rawBody) {
    return rawBody.length;
  }

  if (body == null) {
    return undefined;
  }

  try {
    return Buffer.byteLength(JSON.stringify(body));
  } catch {
    return undefined;
  }
}

function sanitizeString(value: string): string {
  return SECRET_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, '[REDACTED]'),
    value,
  );
}
