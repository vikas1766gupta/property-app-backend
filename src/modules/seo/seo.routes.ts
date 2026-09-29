import { Router } from "express";
import { asyncHandler } from "@common/middleware/asyncHandler.middleware";
import { SeoController } from "./seo.controller";

export function seoRoutes(controller: SeoController): Router {
  const router = Router();
  router.get("/seo/locations/:slug", asyncHandler(controller.location));
  router.get("/seo/sitemap.xml", asyncHandler(controller.sitemap));
  router.get("/robots.txt", asyncHandler(controller.robots));
  return router;
}
