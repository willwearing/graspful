import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { getLogger, SeverityNumber } from './otel-logger';
import {
  REQUEST_LOG_OPTIONS_KEY,
  RequestLogOptions,
} from './logging.decorators';
import {
  emitLog,
  getBodySize,
  sanitizeValue,
  summarizeBody,
} from './logging.utils';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = getLogger('http');

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const route = `${req.baseUrl || ''}${req.route?.path || ''}` || url;
    const userId = req.orgContext?.userId || req.user?.userId || undefined;
    const orgId = req.orgContext?.orgId || req.params?.orgId || undefined;
    const requestId = req.requestId;
    const start = Date.now();
    const logOptions =
      this.reflector.getAllAndOverride<RequestLogOptions>(REQUEST_LOG_OPTIONS_KEY, [
        handler,
        context.getClass(),
      ]) ?? {};

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const status = res.statusCode;
          const duration = Date.now() - start;
          const msg = `${method} ${route} ${status} ${duration}ms`;

          emitLog(
            this.logger,
            'http',
            status >= 400 ? SeverityNumber.WARN : SeverityNumber.INFO,
            status >= 400 ? 'WARN' : 'INFO',
            msg,
            this.buildRequestAttributes(req, {
              logOptions,
              status,
              duration,
              requestId,
              route,
              url,
              userId,
              orgId,
            }),
          );
        },
        error: (err) => {
          const status = err.status || 500;
          const duration = Date.now() - start;
          const msg = `${method} ${route} ${status} ${duration}ms - ${err.message}`;

          emitLog(
            this.logger,
            'http',
            status >= 500 ? SeverityNumber.ERROR : SeverityNumber.WARN,
            status >= 500 ? 'ERROR' : 'WARN',
            msg,
            this.buildRequestAttributes(req, {
              logOptions,
              status,
              duration,
              requestId,
              route,
              url,
              userId,
              orgId,
              errorMessage: err.message,
            }),
          );
        },
      }),
    );
  }

  private buildRequestAttributes(
    req: any,
    input: {
      logOptions: RequestLogOptions;
      status: number;
      duration: number;
      requestId?: string;
      route: string;
      url: string;
      userId?: string;
      orgId?: string;
      errorMessage?: string;
    },
  ) {
    const query = req.query ?? {};
    const allowQueryValues = new Set(input.logOptions.allowQueryValues ?? []);
    const queryValues = Object.fromEntries(
      Object.entries(query)
        .filter(([key]) => allowQueryValues.has(key))
        .map(([key, value]) => [key, sanitizeValue(key, value)]),
    );

    return {
      'request.id': input.requestId,
      'http.method': req.method,
      'http.route': input.route,
      'http.url': input.url,
      'http.status_code': input.status,
      'http.duration_ms': input.duration,
      'http.request.body.size': getBodySize(req.body, req.rawBody),
      'http.request.content_type': req.headers['content-type'],
      'http.query_keys': Object.keys(query).sort(),
      ...(Object.keys(queryValues).length > 0 && { 'http.query_values': queryValues }),
      ...(Object.keys(req.params ?? {}).length > 0 && {
        'http.route_params': sanitizeValue('params', req.params),
      }),
      ...(req.ip && { 'client.address': req.ip }),
      ...(req.headers['user-agent'] && {
        'user_agent.original': req.headers['user-agent'],
      }),
      ...(input.userId && { 'user.id': input.userId }),
      ...(input.orgId && { 'org.id': input.orgId }),
      ...(req.orgContext?.email && { 'user.email': req.orgContext.email }),
      ...(input.errorMessage && { 'error.message': input.errorMessage }),
      ...this.resolveBodyAttributes(req.body, input.logOptions),
    };
  }

  private resolveBodyAttributes(body: unknown, logOptions: RequestLogOptions) {
    const mode = logOptions.bodyMode ?? 'none';

    if (mode === 'none') {
      return {};
    }

    if (mode === 'summary') {
      return {
        'http.request.body': summarizeBody(body),
      };
    }

    return {
      'http.request.body': sanitizeValue('body', body),
    };
  }
}
