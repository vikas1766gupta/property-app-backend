import { Request, Response, NextFunction } from "express";
import { logger } from "@common/logger/logger";

/** Logs method, route, status code and response time for every request. */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info("request", {
      method: req.method,
      route: req.originalUrl,
      requestId: res.locals.requestId,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  next();
}
