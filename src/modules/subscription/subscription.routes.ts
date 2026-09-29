import { Router } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.middleware";
import {
  requireAuth,
  requireRole,
} from "../../common/middleware/auth.middleware";
import { SubscriptionController } from "./subscription.controller";

export function subscriptionRoutes(controller: SubscriptionController): Router {
  const router = Router();
  router.get("/plans", asyncHandler(controller.plans));
  router.get(
    "/subscriptions/me",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.mine),
  );
  router.post(
    "/subscriptions",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.create),
  );
  router.post(
    "/subscriptions/:id/cancel",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.cancel),
  );
  router.get(
    "/subscriptions/history",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.history),
  );
  router.get(
    "/entitlements/me",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.entitlements),
  );
  return router;
}
