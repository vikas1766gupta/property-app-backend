import { Router, raw } from "express";
import { PaymentController } from "./payment.controller";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";

export function paymentRoutes(controller: PaymentController): Router {
  const router = Router();

  router.post("/intent", requireAuth, requireRole("BUSINESS"), asyncHandler(controller.createIntent));
  router.get("/history", requireAuth, requireRole("BUSINESS"), asyncHandler(controller.history));

  // Raw body required for Stripe signature verification — mounted separately in app.ts too,
  // kept here for completeness of the module's route table.
  router.post("/webhook", raw({ type: "application/json" }), asyncHandler(controller.webhook));

  return router;
}
