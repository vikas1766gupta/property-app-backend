import { Router } from "express";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { BusinessController } from "./business.controller";

export function businessRoutes(controller: BusinessController): Router {
  const router = Router();

  router.get("/", asyncHandler(controller.list));
  router.patch(
    "/me",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.updateMine),
  );
  router.get("/:id/properties", asyncHandler(controller.properties));
  router.get("/:id", asyncHandler(controller.getById));

  return router;
}
