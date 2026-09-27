import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError, ForbiddenError } from "@common/errors/AppError";
import { env } from "@config/env";
import { z } from "zod";

const authPayloadSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["BUSINESS", "BUYER", "ADMIN"]),
  businessId: z.string().min(1).optional(),
});

function jwtSecret(): string {
  return process.env.JWT_SECRET || env.jwtSecret;
}

export interface AuthPayload {
  userId: string;
  role: "BUSINESS" | "BUYER" | "ADMIN";
  businessId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/** Verifies the JWT and attaches the decoded payload to req.auth. Throws 401 if missing/invalid. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  try {
    const token = header.slice("Bearer ".length);
    req.auth = authPayloadSchema.parse(jwt.verify(token, jwtSecret(), { algorithms: ["HS256"] }));
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

/** Restricts a route to one or more roles. Use after requireAuth. */
export function requireRole(...roles: AuthPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new ForbiddenError(`Requires role: ${roles.join(" or ")}`);
    }
    next();
  };
}

/** Populates req.auth if a valid token is present, but never throws — for public/optional-auth routes. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.auth = authPayloadSchema.parse(jwt.verify(header.slice(7), jwtSecret(), { algorithms: ["HS256"] }));
    } catch {
      // ignore invalid token on optional routes
    }
  }
  next();
}
