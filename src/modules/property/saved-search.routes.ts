import { Router } from "express";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { SavedSearchController } from "./saved-search.controller";

export function savedSearchRoutes(controller: SavedSearchController): Router {
  const router = Router();
  router.use(requireAuth, requireRole("BUYER"));
  router.get("/", asyncHandler(controller.listMine));
  router.post("/", asyncHandler(controller.create));
  router.delete("/:id", asyncHandler(controller.remove));
  return router;
}