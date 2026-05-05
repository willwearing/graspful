import { SeverityNumber, type LogAttributes } from "@opentelemetry/api-logs";
import { after } from "next/server";
import { loggerProvider } from "@/instrumentation";

type ServerLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const severityByLevel: Record<ServerLogLevel, SeverityNumber> = {
  DEBUG: SeverityNumber.DEBUG,
  INFO: SeverityNumber.INFO,
  WARN: SeverityNumber.WARN,
  ERROR: SeverityNumber.ERROR,
};

export function emitServerLog(
  loggerName: string,
  severityText: ServerLogLevel,
  body: string,
  attributes: LogAttributes = {},
) {
  if (process.env.NEXT_RUNTIME === "edge") return;

  loggerProvider?.getLogger(loggerName).emit({
    severityNumber: severityByLevel[severityText],
    severityText,
    body,
    attributes,
  });
}

export function flushServerLogsAfterResponse() {
  const provider = loggerProvider;
  if (process.env.NEXT_RUNTIME === "edge" || !provider) return;

  after(async () => {
    await provider.forceFlush();
  });
}
