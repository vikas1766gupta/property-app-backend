import { describe, expect, it, vi } from 'vitest';
import { PromotionService } from './promotion.service';

const config = { id: 'cfg', type: 'FEATURED' as const, price: 100, durationDays: 2, allowedCustomerTypes: ['BROKER' as const], priorityWeight: 10, isActive: true };
const base = { propertyId: 'property-1', projectId: null, businessId: 'business-1', type: 'FEATURED' as const, startAt: new Date(), endAt: new Date(Date.now() + 1000), status: 'PENDING_PAYMENT' as const, paymentId: null, priorityWeight: 10 };

function setup(existing: any = null) {
  const repo = { findConfig: vi.fn().mockResolvedValue(config), findPendingOrActive: vi.fn().mockResolvedValue(existing), create: vi.fn().mockResolvedValue({ id: 'promotion-1', ...base }), listByBusiness: vi.fn() };
  const businessRepo = { findById: vi.fn().mockResolvedValue({ accountType: 'BROKER' }) };
  return { service: new PromotionService(repo as any, undefined, businessRepo as any), repo };
}

describe('PromotionService', () => {
  it('creates a paid boost for an eligible business', async () => {
    const { service } = setup();
    const result = await service.purchase({ businessId: 'business-1', customerType: 'BROKER', targetType: 'PROPERTY', targetId: 'property-1', type: 'FEATURED' });
    expect(result.promotion.status).toBe('PENDING_PAYMENT');
    expect(result.config.price).toBe(100);
  });

  it('prevents duplicate pending or active purchases', async () => {
    const { service } = setup({ id: 'existing' });
    await expect(service.purchase({ businessId: 'business-1', customerType: 'BROKER', targetType: 'PROPERTY', targetId: 'property-1', type: 'FEATURED' })).rejects.toMatchObject({ statusCode: 409 });
    expect((service as any).repo.create).not.toHaveBeenCalled();
  });
});
