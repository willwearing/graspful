import { SetMetadata } from '@nestjs/common';

export type RequestBodyLogMode = 'none' | 'summary' | 'full';

export interface RequestLogOptions {
  bodyMode?: RequestBodyLogMode;
  allowQueryValues?: string[];
}

export const REQUEST_LOG_OPTIONS_KEY = 'requestLogOptions';

export const LogRequest = (options: RequestLogOptions) =>
  SetMetadata(REQUEST_LOG_OPTIONS_KEY, options);
