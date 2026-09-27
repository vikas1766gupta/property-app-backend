import { Router } from "express";
import { PropertyController } from "./property.controller";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { propertyImageUploadMiddleware } from "./property-image-upload.middleware";

export function propertyRoutes(controller: PropertyController): Router {
  const router = Router();

  // Public — no login required to browse
  router.get("/", asyncHandler(controller.search));
  router.get("/:id", asyncHandler(controller.getById));

  // Business only
  router.post("/images/upload", requireAuth, requireRole("BUSINESS"), propertyImageUploadMiddleware, asyncHandler(controller.uploadImage));
  router.post("/", requireAuth, requireRole("BUSINESS"), asyncHandler(controller.create));
  router.get("/mine/all", requireAuth, requireRole("BUSINESS"), asyncHandler(controller.myListings));
  router.get("/mine/free-remaining", requireAuth, requireRole("BUSINESS"), asyncHandler(controller.freeListingsRemaining));
  router.patch("/:id", requireAuth, requireRole("BUSINESS"), asyncHandler(controller.update));
  router.delete("/:id", requireAuth, requireRole("BUSINESS"), asyncHandler(controller.remove));

  return router;
}
