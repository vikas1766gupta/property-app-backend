import { Router } from "express";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { AnalyticsController } from "./analytics.controller";

export function analyticsRoutes(controller: AnalyticsController): Router {
  const router = Router();
  router.post("/analytics/events", asyncHandler(controller.record));
  router.get(
    "/businesses/me/analytics",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.business),
  );
  router.get(
    "/businesses/me/analytics/projects",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.builder),
  );
  router.get(
    "/admin/analytics",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(controller.admin),
  );
  return router;
}
