export type OutputFormat = 'human' | 'json';

let globalFormat: OutputFormat = 'human';

export function setOutputFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getOutputFormat(): OutputFormat {
  return globalFormat;
}

export function output(data: unknown, humanMessage?: string): void {
  if (globalFormat === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(humanMessage ?? JSON.stringify(data, null, 2));
  }
}

export function outputError(message: string, data?: unknown): void {
  if (globalFormat === 'json') {
    console.error(JSON.stringify({ error: message, ...((data as Record<string, unknown>) ?? {}) }));
  } else {
    console.error(message);
  }
}
