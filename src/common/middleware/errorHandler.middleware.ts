import { Request, Response, NextFunction } from "express";
import { AppError } from "@common/errors/AppError";
import { logger } from "@common/logger/logger";

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, route: req.originalUrl });
    } else {
      logger.warn(err.message, { route: req.originalUrl, statusCode: err.statusCode });
    }
    res.status(err.statusCode).json({ error: err.message, details: err.details, requestId: res.locals.requestId });
    return;
  }

  logger.error("Unhandled error", { err, route: req.originalUrl });
  res.status(500).json({ error: "Internal server error", requestId: res.locals.requestId });
}
