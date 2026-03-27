import "server-only";

type MonitoringSeverity = "info" | "warning" | "error" | "critical";

type MonitoringInput = {
  alert?: boolean;
  context?: Record<string, unknown>;
  error?: unknown;
  message: string;
  severity?: MonitoringSeverity;
  source: string;
};

type MonitoringPayload = {
  app: string;
  context?: Record<string, unknown>;
  env: string;
  message: string;
  severity: MonitoringSeverity;
  source: string;
  stack?: string;
  timestamp: string;
};

const APP_NAME = "daytona-car-rentals";

export async function reportMonitoringEvent(input: MonitoringInput): Promise<void> {
  const payload = buildPayload(input);

  logToConsole(payload, input.error);

  if (!shouldAlert(payload.severity, input.alert)) {
    return;
  }

  await sendAlert(payload);
}

function buildPayload(input: MonitoringInput): MonitoringPayload {
  return {
    app: APP_NAME,
    env: process.env.MONITORING_ENV || process.env.NODE_ENV || "development",
    message: input.message,
    severity: input.severity ?? "error",
    source: input.source,
    timestamp: new Date().toISOString(),
    ...(input.context ? { context: input.context } : {}),
    ...(input.error instanceof Error && input.error.stack ? { stack: input.error.stack } : {}),
  };
}

function logToConsole(payload: MonitoringPayload, error: unknown) {
  const logger =
    payload.severity === "info"
      ? console.info
      : payload.severity === "warning"
        ? console.warn
        : console.error;

  logger("[monitoring]", {
    ...payload,
    ...(error instanceof Error ? { errorName: error.name } : {}),
  });
}

function shouldAlert(severity: MonitoringSeverity, alert = true) {
  if (!alert) {
    return false;
  }

  return severity === "error" || severity === "critical";
}

async function sendAlert(payload: MonitoringPayload) {
  const webhookUrl = process.env.MONITORING_ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `[${payload.severity.toUpperCase()}] ${payload.source}: ${payload.message}`,
        ...payload,
      }),
    });
  } catch (error) {
    console.error("[monitoring] Failed to send alert webhook.", {
      source: payload.source,
      message: payload.message,
      error: error instanceof Error ? error.message : error,
    });
  }
}
