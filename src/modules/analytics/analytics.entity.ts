export type AnalyticsEventType =
  | "PROPERTY_VIEW"
  | "SEARCH"
  | "FAVORITE"
  | "CONTACT_CLICK"
  | "CALL_CLICK"
  | "WHATSAPP_CLICK"
  | "LEAD_CREATED"
  | "SITE_VISIT_REQUESTED"
  | "PROPERTY_CREATED"
  | "PROPERTY_FEATURED"
  | "SUBSCRIPTION_PURCHASED"
  | "PAYMENT_COMPLETED"
  | "PROJECT_VIEW";

export interface AnalyticsEventInput {
  event: AnalyticsEventType;
  userId?: string;
  businessId?: string;
  propertyId?: string;
  projectId?: string;
  city?: string;
  propertyType?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface AnalyticsRange {
  from: Date;
  to: Date;
  days: 7 | 30 | 90;
}
export interface TopAnalyticsItem {
  id: string;
  name: string;
  views: number;
  enquiries: number;
  favorites?: number;
}
export interface BusinessAnalyticsSummary {
  range: AnalyticsRange;
  propertyViews: number;
  enquiries: number;
  contactActions: number;
  favorites: number;
  conversionToLead: number;
  topProperties: TopAnalyticsItem[];
}
export interface BuilderAnalyticsSummary {
  range: AnalyticsRange;
  projectViews: number;
  enquiries: number;
  enquiryConversion: number;
  topProjects: TopAnalyticsItem[];
}
export interface AdminAnalyticsSummary {
  range: AnalyticsRange;
  newUsers: number;
  activeListings: number;
  views: number;
  leads: number;
  subscriptions: number;
  revenue: number;
  cityDistribution: Array<{ label: string; count: number }>;
  propertyTypeDistribution: Array<{ label: string; count: number }>;
}

export interface IAnalyticsRepository {
  record(input: AnalyticsEventInput): Promise<void>;
  businessSummary(
    businessId: string,
    range: AnalyticsRange,
  ): Promise<BusinessAnalyticsSummary>;
  builderSummary(
    businessId: string,
    range: AnalyticsRange,
  ): Promise<BuilderAnalyticsSummary>;
  adminSummary(range: AnalyticsRange): Promise<AdminAnalyticsSummary>;
}
