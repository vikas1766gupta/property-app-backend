import { Router } from "express";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { requireAuth, requireRole } from "@common/middleware/auth.middleware";
import { ProjectController } from "./project.controller";

export function projectRoutes(controller: ProjectController): Router {
  const router = Router();
  router.get("/", asyncHandler(controller.search));
  router.get("/mine/all", asyncHandler(controller.list));
  router.get("/:id", asyncHandler(controller.getById));
  router.post("/:id/enquiries", asyncHandler(controller.enquiry));
  router.use(requireAuth, requireRole("BUSINESS"));
  router.post("/", asyncHandler(controller.create));
  router.patch("/:id", asyncHandler(controller.update));
  router.delete("/:id", asyncHandler(controller.remove));
  return router;
}