import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";

import { env } from "@config/env";
import { requestLoggerMiddleware } from "@common/middleware/requestLogger.middleware";
import { errorHandlerMiddleware } from "@common/middleware/errorHandler.middleware";

import { UserRepositoryPrisma } from "@modules/auth/auth.repository.prisma";
import { AuthService } from "@modules/auth/auth.service";
import { AuthController } from "@modules/auth/auth.controller";
import { authRoutes } from "@modules/auth/auth.routes";

import { PropertyRepositoryPrisma } from "@modules/property/property.repository.prisma";
import { PropertyService } from "@modules/property/property.service";
import { PropertyController } from "@modules/property/property.controller";
import { propertyRoutes } from "@modules/property/property.routes";

import { PaymentRepositoryPrisma } from "@modules/payment/payment.repository.prisma";
import { PaymentService } from "@modules/payment/payment.service";
import { PaymentController } from "@modules/payment/payment.controller";
import { paymentRoutes } from "@modules/payment/payment.routes";

import { AdminController } from "@modules/admin/admin.controller";
import { adminRoutes } from "@modules/admin/admin.routes";

import { LeadRepositoryPrisma } from "@modules/lead/lead.repository.prisma";
import { LeadService } from "@modules/lead/lead.service";
import { LeadController } from "@modules/lead/lead.controller";
import { leadRoutes } from "@modules/lead/lead.routes";

/**
 * Composition root: this is the ONE place that constructs concrete
 * repositories (Prisma) and injects them into services. To move to a
 * different DB, swap only the `*RepositoryPrisma` instantiations below for
 * classes implementing the same interfaces — nothing else in the app changes.
 */
export function buildApp(): Express {
  const prisma = new PrismaClient();
  const app = express();

  // --- Repositories (data access layer) ---
  const userRepo = new UserRepositoryPrisma(prisma);
  const propertyRepo = new PropertyRepositoryPrisma(prisma);
  const paymentRepo = new PaymentRepositoryPrisma(prisma);
  const leadRepo = new LeadRepositoryPrisma(prisma);

  // --- Services (business logic layer) ---
  const authService = new AuthService(userRepo, env.jwtSecret);
  const paymentService = new PaymentService(paymentRepo, env.stripeSecretKey);
  const propertyService = new PropertyService(propertyRepo, paymentService);
  const leadService = new LeadService(leadRepo, propertyRepo);

  // --- Controllers (HTTP layer) ---
  const authController = new AuthController(authService);
  const propertyController = new PropertyController(propertyService);
  const paymentController = new PaymentController(paymentService, propertyService);
  const adminController = new AdminController(prisma);
  const leadController = new LeadController(leadService);

  // --- Global middleware ---
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
  app.use(requestLoggerMiddleware);

  // Stripe webhook needs the raw body — must be registered BEFORE express.json()
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    paymentController.webhook
  );

  app.use(express.json());

  // --- Routes ---
  app.use("/api/auth", authRoutes(authController));
  app.use("/api/properties", propertyRoutes(propertyController));
  app.use("/api/payments", paymentRoutes(paymentController));
  app.use("/api/admin", adminRoutes(adminController));
  app.use("/api/leads", leadRoutes(leadController));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use(errorHandlerMiddleware);

  return app;
}
