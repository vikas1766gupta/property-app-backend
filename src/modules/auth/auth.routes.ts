import { Router } from "express";
import { AuthController } from "./auth.controller";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";

export function authRoutes(controller: AuthController): Router {
  const router = Router();
  router.post("/business/register", asyncHandler(controller.registerBusiness));
  router.post("/buyer/register", asyncHandler(controller.registerBuyer));
  router.post("/login", asyncHandler(controller.login));
  return router;
}
