import { Router } from "express";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { NotificationController } from "./notification.controller";

export function notificationRoutes(controller: NotificationController): Router {
  const router = Router();
  router.use(requireAuth, requireRole("BUYER"));
  router.get("/", asyncHandler(controller.listMine));
  return router;
}