import { BadRequestError } from "@common/errors/AppError";
import {
  AnalyticsEventInput,
  AnalyticsRange,
  BuilderAnalyticsSummary,
  BusinessAnalyticsSummary,
  IAnalyticsRepository,
  AdminAnalyticsSummary,
} from "./analytics.entity";

export class AnalyticsService {
  constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

  record(input: AnalyticsEventInput): Promise<void> {
    return this.analyticsRepo.record(input);
  }
  businessSummary(
    businessId: string,
    days?: number,
  ): Promise<BusinessAnalyticsSummary> {
    return this.analyticsRepo.businessSummary(businessId, rangeFor(days));
  }
  builderSummary(
    businessId: string,
    days?: number,
  ): Promise<BuilderAnalyticsSummary> {
    return this.analyticsRepo.builderSummary(businessId, rangeFor(days));
  }
  adminSummary(days?: number): Promise<AdminAnalyticsSummary> {
    return this.analyticsRepo.adminSummary(rangeFor(days));
  }
}

export function rangeFor(days?: number): AnalyticsRange {
  const selected = days ?? 30;
  if (selected !== 7 && selected !== 30 && selected !== 90)
    throw new BadRequestError("Analytics range must be 7, 30, or 90 days");
  const to = new Date();
  return {
    days: selected,
    from: new Date(to.getTime() - selected * 24 * 60 * 60 * 1000),
    to,
  };
}
