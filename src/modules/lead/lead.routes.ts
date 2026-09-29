import { Router } from "express";
import { LeadController } from "./lead.controller";
import {
  optionalAuth,
  requireAuth,
  requireRole,
} from "@common/middleware/auth.middleware";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";

export function leadRoutes(controller: LeadController): Router {
  const router = Router();
  router.get(
    "/summary",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.summary),
  );
  router.get(
    "/",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.list),
  );
  router.get(
    "/mine",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.listMine),
  );
  router.get(
    "/:id",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.getById),
  );
  router.patch(
    "/:id/status",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.updateStatus),
  );
  router.patch(
    "/:id",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.update),
  );
  router.post(
    "/:id/notes",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.addNote),
  );
  router.post(
    "/:id/follow-up",
    requireAuth,
    requireRole("BUSINESS"),
    asyncHandler(controller.followUp),
  );
  // Public — a buyer doesn't need an account to send an inquiry; if logged in,
  // optionalAuth attaches req.auth so the lead can still be linked to their user.
  router.post("/", optionalAuth, asyncHandler(controller.create));
  return router;
}
