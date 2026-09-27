import { Router } from "express";
import { LeadController } from "./lead.controller";
import { optionalAuth, requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";

export function leadRoutes(controller: LeadController): Router {
  const router = Router();
  // Business inbox — the controller scopes results to the business in the verified token.
  router.get("/mine", requireAuth, requireRole("BUSINESS"), asyncHandler(controller.listMine));
  // Public — a buyer doesn't need an account to send an inquiry; if logged in,
  // optionalAuth attaches req.auth so the lead can still be linked to their user.
  router.post("/", optionalAuth, asyncHandler(controller.create));
  return router;
}
