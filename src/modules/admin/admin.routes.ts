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
  router.get("/projects", asyncHandler(controller.listProjects));
  router.patch("/projects/:id/moderate", asyncHandler(controller.moderateProject));
  router.get("/reports/revenue", asyncHandler(controller.revenueReport));
  router.get("/reports/subscriptions", asyncHandler(controller.subscriptionReport));
  router.get("/notifications/delivery-failures", asyncHandler(controller.notificationDeliveryFailures));
  router.get("/pricing", asyncHandler(controller.getPricing));
  router.patch("/pricing", asyncHandler(controller.updatePricing));
  router.get("/plans", asyncHandler(controller.listPlans));
  router.post("/plans", asyncHandler(controller.createPlan));
  router.patch("/plans/:id", asyncHandler(controller.updatePlan));

  return router;
}
