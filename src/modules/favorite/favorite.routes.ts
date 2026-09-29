import { Router } from "express";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { FavoriteController } from "./favorite.controller";

export function favoriteRoutes(controller: FavoriteController): Router {
  const router = Router();
  router.use(requireAuth, requireRole("BUYER"));
  router.get("/", asyncHandler(controller.list));
  router.put("/:propertyId", asyncHandler(controller.add));
  router.delete("/:propertyId", asyncHandler(controller.remove));
  return router;
}
