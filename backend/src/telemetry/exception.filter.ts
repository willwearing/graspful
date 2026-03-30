import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { getLogger, SeverityNumber } from './otel-logger';
import type { PostHogService } from '@/shared/application/posthog.service';

@Catch()
export class OtelExceptionFilter extends BaseExceptionFilter {
  private logger = getLogger('exceptions');

  constructor(
    httpAdapter: ConstructorParameters<typeof BaseExceptionFilter>[0],
    private posthog?: PostHogService,
  ) {
    super(httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Unknown error';

    const stack =
      exception instanceof Error ? exception.stack : undefined;

    // Only log 5xx as ERROR — 4xx are client errors, not our bugs
    if (status >= 500) {
      this.logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
        body: `Unhandled exception: ${message}`,
        attributes: {
          'error.type': exception?.constructor?.name || 'Error',
          'error.message': message,
          'http.status_code': status,
          ...(stack && { 'error.stack': stack }),
        },
      });
      if (exception instanceof Error) {
        this.posthog?.captureException(exception, 'server', { 'http.status_code': status });
      }
    }

    super.catch(exception, host);
  }
}
