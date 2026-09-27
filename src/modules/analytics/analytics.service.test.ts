import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService, rangeFor } from './analytics.service';

describe('AnalyticsService', () => {
  it('records events through the application boundary', async () => {
    const repository = { record: vi.fn().mockResolvedValue(undefined) } as any;
    await new AnalyticsService(repository).record({ event: 'PROPERTY_VIEW', propertyId: 'property-1', userId: 'buyer-1' });
    expect(repository.record).toHaveBeenCalledWith({ event: 'PROPERTY_VIEW', propertyId: 'property-1', userId: 'buyer-1' });
  });

  it.each([7, 30, 90] as const)('creates a %s-day range', (days) => {
    const range = rangeFor(days);
    expect(range.days).toBe(days);
    expect(range.to.getTime() - range.from.getTime()).toBe(days * 24 * 60 * 60 * 1000);
  });

  it('rejects unsupported ranges', () => {
    expect(() => rangeFor(14)).toThrow('Analytics range must be 7, 30, or 90 days');
  });

  it('passes business identity into aggregate queries for isolation', async () => {
    const repository = { businessSummary: vi.fn().mockResolvedValue({ propertyViews: 4 }) } as any;
    const service = new AnalyticsService(repository);
    await service.businessSummary('business-1', 7);
    expect(repository.businessSummary).toHaveBeenCalledWith('business-1', expect.objectContaining({ days: 7 }));
  });
});
