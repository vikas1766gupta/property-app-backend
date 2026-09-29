export type SubscriptionStatus =
  "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "INCOMPLETE";
export type BillingInterval = "MONTHLY" | "YEARLY";

export interface Plan {
  id: string;
  name: string;
  accountType: "OWNER" | "BROKER" | "BUILDER" | null;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  maxActiveListings: number;
  featuredCredits: number;
  maxTeamMembers: number;
  leadManagement: boolean;
  analytics: boolean;
  priorityVisibility: boolean;
  profileVisibility: boolean;
  projectListingAccess: boolean;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  businessId: string;
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  provider: string;
  providerSubscriptionId: string | null;
}

export interface Entitlements extends Plan {
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  listingUsage: number;
  listingLimitReached: boolean;
}
