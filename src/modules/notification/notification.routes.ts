import { Router } from "express";
import { requireAuth } from "@common/middleware/auth.middleware";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { NotificationController } from "./notification.controller";

export function notificationRoutes(controller: NotificationController): Router {
  const router = Router();
  router.use(requireAuth);
  router.get("/", asyncHandler(controller.listMine));
  router.get("/preferences", asyncHandler(controller.getPreferences));
  router.patch("/preferences", asyncHandler(controller.updatePreferences));
  return router;
}
