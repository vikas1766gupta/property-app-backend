import { NextFunction, Request, RequestHandler, Response } from "express";

/** Forwards rejected async route handlers to Express error middleware (Express 4). */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}
