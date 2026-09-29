import winston from "winston";

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const isProd = process.env.NODE_ENV === "production";

const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}] ${stack ?? message}${metaStr}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

/**
 * Centralized logger — use this everywhere instead of console.log.
 * Levels: error, warn, info, debug (default threshold: info, or LOG_LEVEL env var).
 *
 * In production, wire a transport for your log aggregator (CloudWatch, Datadog,
 * etc.) by adding it to the `transports` array below — the rest of the app
 * never needs to change.
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  format: isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...(isProd
      ? [
          new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
          }),
          new winston.transports.File({ filename: "logs/combined.log" }),
        ]
      : []),
  ],
  exitOnError: false,
});
