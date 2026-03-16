import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { getLogger, SeverityNumber } from './otel-logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = getLogger('http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const userId = req.user?.sub || req.user?.id || undefined;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const status = res.statusCode;
          const duration = Date.now() - start;
          const msg = `${method} ${url} ${status} ${duration}ms${userId ? ` user=${userId}` : ''}`;

          console.log(`[HTTP] ${msg}`);

          this.logger.emit({
            severityNumber: status >= 400 ? SeverityNumber.WARN : SeverityNumber.INFO,
            severityText: status >= 400 ? 'WARN' : 'INFO',
            body: msg,
            attributes: {
              'http.method': method,
              'http.url': url,
              'http.status_code': status,
              'http.duration_ms': duration,
              ...(userId && { 'user.id': userId }),
            },
          });
        },
        error: (err) => {
          const status = err.status || 500;
          const duration = Date.now() - start;
          const msg = `${method} ${url} ${status} ${duration}ms${userId ? ` user=${userId}` : ''} — ${err.message}`;

          console.error(`[HTTP] ${msg}`);

          this.logger.emit({
            severityNumber: status >= 500 ? SeverityNumber.ERROR : SeverityNumber.WARN,
            severityText: status >= 500 ? 'ERROR' : 'WARN',
            body: msg,
            attributes: {
              'http.method': method,
              'http.url': url,
              'http.status_code': status,
              'http.duration_ms': duration,
              'error.message': err.message,
              ...(userId && { 'user.id': userId }),
            },
          });
        },
      }),
    );
  }
}
