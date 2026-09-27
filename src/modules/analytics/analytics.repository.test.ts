import { describe, expect, it, vi } from 'vitest';
import { AnalyticsRepositoryPrisma } from './analytics.repository.prisma';
import { AnalyticsRange } from './analytics.entity';

const range: AnalyticsRange = { days: 30, from: new Date('2026-09-01T00:00:00Z'), to: new Date('2026-10-01T00:00:00Z') };

describe('AnalyticsRepositoryPrisma', () => {
  it('derives business ownership when creating an event', async () => {
    const prisma: any = {
      property: { findUnique: vi.fn().mockResolvedValue({ businessId: 'business-1', city: 'Pune', listingType: 'SALE' }) },
      analyticsEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    await new AnalyticsRepositoryPrisma(prisma).record({ event: 'PROPERTY_VIEW', propertyId: 'property-1', businessId: 'spoofed-business' });
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ businessId: 'business-1', city: 'Pune', propertyType: 'SALE' }) }));
  });

  it('aggregates business events and calculates conversion', async () => {
    const prisma: any = {
      analyticsEvent: {
        count: vi.fn().mockImplementation(({ where }) => Promise.resolve(where.event === 'PROPERTY_VIEW' ? 10 : where.event === 'LEAD_CREATED' ? 2 : where.event === 'FAVORITE' ? 3 : 4)),
        groupBy: vi.fn().mockResolvedValue([
          { propertyId: 'property-1', event: 'PROPERTY_VIEW', _count: { _all: 8 } },
          { propertyId: 'property-1', event: 'LEAD_CREATED', _count: { _all: 2 } },
        ]),
      },
      property: { findMany: vi.fn().mockResolvedValue([{ id: 'property-1', title: 'Pune home' }]) },
    };
    const result = await new AnalyticsRepositoryPrisma(prisma).businessSummary('business-1', range);
    expect(result.propertyViews).toBe(10);
    expect(result.enquiries).toBe(2);
    expect(result.conversionToLead).toBe(20);
    expect(result.topProperties[0]).toMatchObject({ id: 'property-1', views: 8, enquiries: 2 });
    expect(prisma.analyticsEvent.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ businessId: 'business-1', occurredAt: range.from ? expect.any(Object) : undefined }) }));
  });

  it('aggregates admin totals and distributions', async () => {
    const prisma: any = {
      user: { count: vi.fn().mockResolvedValue(5) },
      property: {
        count: vi.fn().mockResolvedValue(8),
        groupBy: vi.fn().mockImplementation(({ by }) => Promise.resolve(by[0] === 'city' ? [{ city: 'Pune', _count: { _all: 6 } }] : [{ listingType: 'SALE', _count: { _all: 7 } }])),
      },
      analyticsEvent: { count: vi.fn().mockResolvedValue(40) },
      lead: { count: vi.fn().mockResolvedValue(3) },
      subscription: { count: vi.fn().mockResolvedValue(2) },
      payment: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 12500 } }) },
    };
    const result = await new AnalyticsRepositoryPrisma(prisma).adminSummary(range);
    expect(result).toMatchObject({ newUsers: 5, activeListings: 8, views: 40, leads: 3, subscriptions: 2, revenue: 12500 });
    expect(result.cityDistribution).toEqual([{ label: 'Pune', count: 6 }]);
    expect(result.propertyTypeDistribution).toEqual([{ label: 'SALE', count: 7 }]);
  });
});
