import { Router } from "express";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import {
  optionalAuth,
  requireAuth,
  requireRole,
} from "@common/middleware/auth.middleware";
import { TrustController } from "./trust.controller";

export function trustRoutes(controller: TrustController): Router {
  const router = Router();
  router.post("/reports", optionalAuth, asyncHandler(controller.createReport));
  router.get(
    "/admin/reports",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(controller.listReports),
  );
  router.patch(
    "/admin/reports/:id",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(controller.moderateReport),
  );
  router.patch(
    "/admin/verifications/:id",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(controller.reviewVerification),
  );
  router.post(
    "/admin/verifications",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(controller.createVerification),
  );
  return router;
}
