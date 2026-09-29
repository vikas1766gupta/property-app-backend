import { Router } from "express";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { PromotionController } from "./promotion.controller";

export function promotionRoutes(controller: PromotionController): Router {
  const router = Router();
  router.get("/promotion-configs", asyncHandler(controller.configs));
  router.patch(
    "/admin/promotion-configs/:type",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(controller.saveConfig),
  );
  router.get("/ads/active", asyncHandler(controller.activeAds));
  router.post("/ads/:id/impression", asyncHandler(controller.impression));
  router.post("/ads/:id/click", asyncHandler(controller.click));
  router.post(
    "/admin/campaigns",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(controller.createCampaign),
  );
  router.get(
    "/admin/campaigns",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(controller.adminCampaigns),
  );
  router.patch(
    "/admin/campaigns/:id/status",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(controller.campaignStatus),
  );
  router.use(requireAuth, requireRole("BUSINESS"));
  router.get("/promotions/mine", asyncHandler(controller.mine));
  router.post("/promotions", asyncHandler(controller.purchase));
  router.post("/campaigns", asyncHandler(controller.createCampaign));
  router.get("/campaigns/mine", asyncHandler(controller.campaigns));
  router.patch(
    "/campaigns/:id/status",
    asyncHandler(controller.campaignStatus),
  );
  return router;
}
