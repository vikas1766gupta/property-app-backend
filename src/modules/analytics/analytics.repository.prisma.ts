import { Prisma, PrismaClient } from "@prisma/client";
import {
  AnalyticsEventInput,
  AnalyticsRange,
  AdminAnalyticsSummary,
  BuilderAnalyticsSummary,
  BusinessAnalyticsSummary,
  IAnalyticsRepository,
  TopAnalyticsItem,
} from "./analytics.entity";

const propertyPerformanceEvents = [
  "PROPERTY_VIEW",
  "LEAD_CREATED",
  "FAVORITE",
] as const;
const projectPerformanceEvents = ["PROJECT_VIEW", "LEAD_CREATED"] as const;
const contactEvents = [
  "CONTACT_CLICK",
  "CALL_CLICK",
  "WHATSAPP_CLICK",
] as const;

export class AnalyticsRepositoryPrisma implements IAnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(input: AnalyticsEventInput): Promise<void> {
    const property = input.propertyId
      ? await this.prisma.property.findUnique({
          where: { id: input.propertyId },
          select: { businessId: true, city: true, listingType: true },
        })
      : null;
    const project = input.projectId
      ? await this.prisma.project.findUnique({
          where: { id: input.projectId },
          select: { builderId: true, city: true, propertyType: true },
        })
      : null;
    await this.prisma.analyticsEvent.create({
      data: {
        event: input.event,
        userId: input.userId,
        businessId:
          property?.businessId ?? project?.builderId ?? input.businessId,
        propertyId: input.propertyId,
        projectId: input.projectId,
        city: property?.city ?? project?.city ?? input.city,
        propertyType:
          project?.propertyType ?? property?.listingType ?? input.propertyType,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        occurredAt: input.occurredAt,
      },
    });
  }

  async businessSummary(
    businessId: string,
    range: AnalyticsRange,
  ): Promise<BusinessAnalyticsSummary> {
    const where = { businessId, occurredAt: { gte: range.from, lt: range.to } };
    const [views, enquiries, contactActions, favorites, groups] =
      await Promise.all([
        this.prisma.analyticsEvent.count({
          where: { ...where, event: "PROPERTY_VIEW" },
        }),
        this.prisma.analyticsEvent.count({
          where: { ...where, event: "LEAD_CREATED" },
        }),
        this.prisma.analyticsEvent.count({
          where: { ...where, event: { in: [...contactEvents] } },
        }),
        this.prisma.analyticsEvent.count({
          where: { ...where, event: "FAVORITE" },
        }),
        this.prisma.analyticsEvent.groupBy({
          by: ["propertyId", "event"],
          where: {
            ...where,
            propertyId: { not: null },
            event: { in: [...propertyPerformanceEvents] },
          },
          _count: { _all: true },
        }),
      ]);
    const topProperties = await this.topProperties(businessId, groups);
    return {
      range,
      propertyViews: views,
      enquiries,
      contactActions,
      favorites,
      conversionToLead: percentage(enquiries, views),
      topProperties,
    };
  }

  async builderSummary(
    businessId: string,
    range: AnalyticsRange,
  ): Promise<BuilderAnalyticsSummary> {
    const where = { businessId, occurredAt: { gte: range.from, lt: range.to } };
    const [views, enquiries, groups] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { ...where, event: "PROJECT_VIEW" },
      }),
      this.prisma.analyticsEvent.count({
        where: { ...where, event: "LEAD_CREATED" },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ["projectId", "event"],
        where: {
          ...where,
          projectId: { not: null },
          event: { in: [...projectPerformanceEvents] },
        },
        _count: { _all: true },
      }),
    ]);
    const topProjects = await this.topProjects(businessId, groups);
    return {
      range,
      projectViews: views,
      enquiries,
      enquiryConversion: percentage(enquiries, views),
      topProjects,
    };
  }

  async adminSummary(range: AnalyticsRange): Promise<AdminAnalyticsSummary> {
    const created = { gte: range.from, lt: range.to };
    const [
      newUsers,
      activeListings,
      views,
      leads,
      subscriptions,
      revenue,
      cities,
      propertyTypes,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: created } }),
      this.prisma.property.count({ where: { status: "PUBLISHED" } }),
      this.prisma.analyticsEvent.count({
        where: {
          event: { in: ["PROPERTY_VIEW", "PROJECT_VIEW"] },
          occurredAt: created,
        },
      }),
      this.prisma.lead.count({ where: { createdAt: created } }),
      this.prisma.subscription.count({ where: { createdAt: created } }),
      this.prisma.payment.aggregate({
        where: { status: "SUCCEEDED", createdAt: created },
        _sum: { amount: true },
      }),
      this.prisma.property.groupBy({
        by: ["city"],
        where: { status: "PUBLISHED" },
        _count: { _all: true },
        orderBy: { _count: { city: "desc" } },
        take: 20,
      }),
      this.prisma.property.groupBy({
        by: ["listingType"],
        where: { status: "PUBLISHED" },
        _count: { _all: true },
        orderBy: { _count: { listingType: "desc" } },
      }),
    ]);
    return {
      range,
      newUsers,
      activeListings,
      views,
      leads,
      subscriptions,
      revenue: Number(revenue._sum.amount ?? 0),
      cityDistribution: cities.map((row) => ({
        label: row.city,
        count: row._count._all,
      })),
      propertyTypeDistribution: propertyTypes.map((row) => ({
        label: row.listingType,
        count: row._count._all,
      })),
    };
  }

  private async topProperties(
    businessId: string,
    groups: Array<{
      propertyId: string | null;
      event: string;
      _count: { _all: number };
    }>,
  ): Promise<TopAnalyticsItem[]> {
    const ids = [
      ...new Set(
        groups.flatMap((row) => (row.propertyId ? [row.propertyId] : [])),
      ),
    ];
    const properties = await this.prisma.property.findMany({
      where: { id: { in: ids }, businessId },
      select: { id: true, title: true },
    });
    return properties
      .map((property) => performanceItem(property.id, property.title, groups))
      .sort((a, b) => b.views - a.views || b.enquiries - a.enquiries)
      .slice(0, 10);
  }

  private async topProjects(
    businessId: string,
    groups: Array<{
      projectId: string | null;
      event: string;
      _count: { _all: number };
    }>,
  ): Promise<TopAnalyticsItem[]> {
    const ids = [
      ...new Set(
        groups.flatMap((row) => (row.projectId ? [row.projectId] : [])),
      ),
    ];
    const projects = await this.prisma.project.findMany({
      where: { id: { in: ids }, builderId: businessId },
      select: { id: true, name: true },
    });
    return projects
      .map((project) =>
        performanceItem(project.id, project.name, groups, "projectId"),
      )
      .sort((a, b) => b.views - a.views || b.enquiries - a.enquiries)
      .slice(0, 10);
  }
}

function performanceItem(
  id: string,
  name: string,
  groups: Array<{
    propertyId?: string | null;
    projectId?: string | null;
    event: string;
    _count: { _all: number };
  }>,
  key: "propertyId" | "projectId" = "propertyId",
): TopAnalyticsItem {
  const matching = groups.filter((row) => row[key] === id);
  return {
    id,
    name,
    views: matching
      .filter(
        (row) =>
          row.event ===
          (key === "propertyId" ? "PROPERTY_VIEW" : "PROJECT_VIEW"),
      )
      .reduce((sum, row) => sum + row._count._all, 0),
    enquiries: matching
      .filter((row) => row.event === "LEAD_CREATED")
      .reduce((sum, row) => sum + row._count._all, 0),
    ...(key === "propertyId"
      ? {
          favorites: matching
            .filter((row) => row.event === "FAVORITE")
            .reduce((sum, row) => sum + row._count._all, 0),
        }
      : {}),
  };
}

function percentage(value: number, total: number): number {
  return total ? Math.round((value / total) * 10000) / 100 : 0;
}
