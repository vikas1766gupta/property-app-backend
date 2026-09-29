import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";

import { env } from "@config/env";
import { requestLoggerMiddleware } from "@common/middleware/requestLogger.middleware";
import { errorHandlerMiddleware } from "@common/middleware/errorHandler.middleware";

import { UserRepositoryPrisma } from "@modules/auth/auth.repository.prisma";
import { AuthService } from "@modules/auth/auth.service";
import { AuthController } from "@modules/auth/auth.controller";
import { authRoutes } from "@modules/auth/auth.routes";

import { PropertyRepositoryPrisma } from "@modules/property/property.repository.prisma";
import { CloudinaryPropertyImageStorage } from "@modules/property/image-storage.cloudinary";
import { PropertyService } from "@modules/property/property.service";
import { PropertyController } from "@modules/property/property.controller";
import { propertyRoutes } from "@modules/property/property.routes";

import { PaymentRepositoryPrisma } from "@modules/payment/payment.repository.prisma";
import { PaymentService } from "@modules/payment/payment.service";
import { PaymentController } from "@modules/payment/payment.controller";
import { paymentRoutes } from "@modules/payment/payment.routes";

import { AdminController } from "@modules/admin/admin.controller";
import { AdminRepositoryPrisma } from "@modules/admin/admin.repository.prisma";
import { AdminService } from "@modules/admin/admin.service";
import { adminRoutes } from "@modules/admin/admin.routes";

import { PricingRepositoryPrisma } from "@modules/pricing/pricing.repository.prisma";
import { PricingService } from "@modules/pricing/pricing.service";

import { LeadRepositoryPrisma } from "@modules/lead/lead.repository.prisma";
import { LeadService } from "@modules/lead/lead.service";
import { LeadController } from "@modules/lead/lead.controller";
import { leadRoutes } from "@modules/lead/lead.routes";

import { FavoriteRepositoryPrisma } from "@modules/favorite/favorite.repository.prisma";
import { FavoriteService } from "@modules/favorite/favorite.service";
import { FavoriteController } from "@modules/favorite/favorite.controller";
import { favoriteRoutes } from "@modules/favorite/favorite.routes";

import { SavedSearchRepositoryPrisma } from "@modules/property/saved-search.repository.prisma";
import { SavedSearchService } from "@modules/property/saved-search.service";
import { SavedSearchController } from "@modules/property/saved-search.controller";
import { savedSearchRoutes } from "@modules/property/saved-search.routes";

import { NotificationRepositoryPrisma } from "@modules/notification/notification.repository.prisma";
import { NotificationService } from "@modules/notification/notification.service";
import { NotificationController } from "@modules/notification/notification.controller";
import { notificationRoutes } from "@modules/notification/notification.routes";
import { NotificationDeliveryRepositoryPrisma } from "@modules/notification/notification.delivery.repository.prisma";
import { BullMqEmailQueue } from "@modules/notification/email.queue.bullmq";

import { BusinessRepositoryPrisma } from "@modules/business/business.repository.prisma";
import { BusinessService } from "@modules/business/business.service";
import { BusinessController } from "@modules/business/business.controller";
import { businessRoutes } from "@modules/business/business.routes";
import { PlanService } from "@modules/subscription/plan.service";
import { SubscriptionRepositoryPrisma } from "@modules/subscription/subscription.repository.prisma";
import { SubscriptionService } from "@modules/subscription/subscription.service";
import { EntitlementService } from "@modules/subscription/entitlement.service";
import { SubscriptionController } from "@modules/subscription/subscription.controller";
import { subscriptionRoutes } from "@modules/subscription/subscription.routes";
import { TrustRepositoryPrisma } from "@modules/trust/trust.repository.prisma";
import { TrustService } from "@modules/trust/trust.service";
import { TrustController } from "@modules/trust/trust.controller";
import { trustRoutes } from "@modules/trust/trust.routes";
import { ProjectRepositoryPrisma } from "@modules/project/project.repository.prisma";
import { ProjectService } from "@modules/project/project.service";
import { ProjectController } from "@modules/project/project.controller";
import { projectRoutes } from "@modules/project/project.routes";
import { PromotionRepositoryPrisma } from "@modules/promotion/promotion.repository.prisma";
import { AdvertisingRepositoryPrisma } from "@modules/promotion/advertising.repository.prisma";
import { PromotionService } from "@modules/promotion/promotion.service";
import { AdvertisingService } from "@modules/promotion/advertising.service";
import { PromotionController } from "@modules/promotion/promotion.controller";
import { promotionRoutes } from "@modules/promotion/promotion.routes";
import { SeoService } from "@modules/seo/seo.service";
import { SeoController } from "@modules/seo/seo.controller";
import { seoRoutes } from "@modules/seo/seo.routes";
import { AnalyticsRepositoryPrisma } from "@modules/analytics/analytics.repository.prisma";
import { AnalyticsService } from "@modules/analytics/analytics.service";
import { AnalyticsController } from "@modules/analytics/analytics.controller";
import { analyticsRoutes } from "@modules/analytics/analytics.routes";
import { requestIdMiddleware } from "@common/middleware/requestId.middleware";

/**
 * Composition root: this is the ONE place that constructs concrete
 * repositories (Prisma) and injects them into services. To move to a
 * different DB, swap only the `*RepositoryPrisma` instantiations below for
 * classes implementing the same interfaces — nothing else in the app changes.
 */
export function buildApp(): Express {
  const prisma = new PrismaClient({
    datasources: { db: { url: env.databaseUrl } },
  });
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // --- Repositories (data access layer) ---
  const userRepo = new UserRepositoryPrisma(prisma);
  const promotionRepo = new PromotionRepositoryPrisma(prisma);
  const advertisingRepo = new AdvertisingRepositoryPrisma(prisma);
  const propertyRepo = new PropertyRepositoryPrisma(prisma, promotionRepo);
  const paymentRepo = new PaymentRepositoryPrisma(prisma);
  const leadRepo = new LeadRepositoryPrisma(prisma);
  const projectRepo = new ProjectRepositoryPrisma(prisma, promotionRepo);
  const trustRepo = new TrustRepositoryPrisma(prisma);
  const adminRepo = new AdminRepositoryPrisma(prisma);
  const pricingRepo = new PricingRepositoryPrisma(prisma);
  const favoriteRepo = new FavoriteRepositoryPrisma(prisma);
  const savedSearchRepo = new SavedSearchRepositoryPrisma(prisma);
  const notificationRepo = new NotificationRepositoryPrisma(prisma);
  const notificationDeliveryRepo = new NotificationDeliveryRepositoryPrisma(
    prisma,
  );
  const emailQueue = new BullMqEmailQueue(env.redisUrl);
  app.locals.prisma = prisma;
  app.locals.emailQueue = emailQueue;
  const businessRepo = new BusinessRepositoryPrisma(prisma);
  const planService = new PlanService(prisma);
  const subscriptionRepo = new SubscriptionRepositoryPrisma(
    prisma,
    planService,
  );
  const analyticsService = new AnalyticsService(
    new AnalyticsRepositoryPrisma(prisma),
  );

  // --- Services (business logic layer) ---
  const authService = new AuthService(userRepo, env.jwtSecret);
  const pricingService = new PricingService(pricingRepo);
  const imageStorage = new CloudinaryPropertyImageStorage(
    env.cloudinaryCloudName,
    env.cloudinaryApiKey,
    env.cloudinaryApiSecret,
  );
  const paymentService = new PaymentService(
    paymentRepo,
    env.stripeSecretKey,
    pricingService,
    undefined,
    analyticsService,
  );
  const notificationService = new NotificationService(
    notificationRepo,
    notificationDeliveryRepo,
    emailQueue,
  );
  const savedSearchService = new SavedSearchService(
    savedSearchRepo,
    notificationService,
  );
  const entitlementService = new EntitlementService(
    planService,
    subscriptionRepo,
    propertyRepo,
    pricingService,
  );
  const propertyService = new PropertyService(
    propertyRepo,
    paymentService,
    pricingService,
    imageStorage,
    savedSearchService,
    entitlementService,
    analyticsService,
  );
  const subscriptionService = new SubscriptionService(
    planService,
    subscriptionRepo,
  );
  paymentService.setListingPublisher((propertyId) =>
    propertyService.publishAfterPayment(propertyId),
  );
  const leadService = new LeadService(
    leadRepo,
    propertyRepo,
    projectRepo,
    analyticsService,
  );
  const projectService = new ProjectService(projectRepo, businessRepo);
  const trustService = new TrustService(trustRepo, trustRepo);
  const adminService = new AdminService(
    adminRepo,
    pricingService,
    notificationDeliveryRepo,
  );
  const favoriteService = new FavoriteService(favoriteRepo);
  const businessService = new BusinessService(businessRepo);
  const promotionService = new PromotionService(
    promotionRepo,
    entitlementService,
    businessRepo,
  );
  const advertisingService = new AdvertisingService(advertisingRepo);
  paymentService.setPromotionActivator((promotionId) =>
    promotionService.activateFromPayment(promotionId),
  );

  // --- Controllers (HTTP layer) ---
  const authController = new AuthController(authService);
  const propertyController = new PropertyController(propertyService);
  const paymentController = new PaymentController(
    paymentService,
    propertyService,
    subscriptionService,
  );
  const adminController = new AdminController(adminService, planService);
  const leadController = new LeadController(leadService);
  const projectController = new ProjectController(projectService, leadService);
  const trustController = new TrustController(trustService);
  const favoriteController = new FavoriteController(favoriteService);
  const savedSearchController = new SavedSearchController(savedSearchService);
  const notificationController = new NotificationController(
    notificationService,
  );
  const businessController = new BusinessController(businessService);
  const subscriptionController = new SubscriptionController(
    planService,
    subscriptionService,
    entitlementService,
    paymentService,
  );
  const promotionController = new PromotionController(
    promotionService,
    advertisingService,
    paymentService,
  );
  const seoController = new SeoController(new SeoService(prisma, propertyRepo));
  const analyticsController = new AnalyticsController(
    analyticsService,
    entitlementService,
  );

  // --- Global middleware ---
  app.use(helmet());
  const corsOrigins = env.corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (env.nodeEnv !== "production") corsOrigins.push("http://127.0.0.1:4200");
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Stripe webhook needs the raw body — must be registered BEFORE express.json()
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    paymentController.webhook,
  );

  app.use(express.json({ limit: "1mb" }));

  // --- Routes ---
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    authRoutes(authController, env.nodeEnv !== "production"),
  );
  app.use(
    "/api/properties/saved-searches",
    savedSearchRoutes(savedSearchController),
  );
  app.use("/api/properties", propertyRoutes(propertyController));
  app.use("/api/payments", paymentRoutes(paymentController));
  app.use("/api/admin", adminRoutes(adminController));
  app.use("/api/leads", leadRoutes(leadController));
  app.use("/api/projects", projectRoutes(projectController));
  app.use("/api", trustRoutes(trustController));
  app.use("/api/favorites", favoriteRoutes(favoriteController));
  app.use("/api/notifications", notificationRoutes(notificationController));
  app.use("/api/businesses", businessRoutes(businessController));
  app.use("/api", subscriptionRoutes(subscriptionController));
  app.use("/api", promotionRoutes(promotionController));
  app.use("/api", seoRoutes(seoController));
  app.use("/api", analyticsRoutes(analyticsController));

  app.get(["/health", "/api/health"], (_req, res) =>
    res.json({ status: "ok", service: "property-api" }),
  );
  app.get(["/readiness", "/api/readiness"], async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await emailQueue.checkHealth();
      res.json({
        status: "ready",
        dependencies: { database: "ok", redis: "ok", emailQueue: "ok" },
      });
    } catch {
      res
        .status(503)
        .json({
          status: "not_ready",
          dependencies: {
            database: "unknown",
            redis: "unknown",
            emailQueue: "unknown",
          },
        });
    }
  });

  app.use(errorHandlerMiddleware);

  return app;
}
