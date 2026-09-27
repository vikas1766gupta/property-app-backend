import { Router } from "express";
import { AdminController } from "./admin.controller";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";

export function adminRoutes(controller: AdminController): Router {
  const router = Router();
  router.use(requireAuth, requireRole("ADMIN"));

  router.get("/businesses", asyncHandler(controller.listBusinesses));
  router.patch("/businesses/:id/verify", asyncHandler(controller.verifyBusiness));
  router.get("/listings", asyncHandler(controller.listAllListings));
  router.patch("/listings/:id/flag", asyncHandler(controller.flagListing));
  router.patch("/listings/:id/remove", asyncHandler(controller.removeListing));
  router.get("/reports/revenue", asyncHandler(controller.revenueReport));
  router.patch("/pricing", asyncHandler(controller.updatePricing));

  return router;
}
