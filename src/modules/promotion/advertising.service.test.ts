import { describe, expect, it, vi } from 'vitest';
import { AdvertisingService } from './advertising.service';

describe('AdvertisingService', () => {
  it('accepts only campaigns with a valid date window', async () => {
    const repository = { create: vi.fn(), findActive: vi.fn(), setStatus: vi.fn(), listByBusiness: vi.fn(), recordImpression: vi.fn(), recordClick: vi.fn() };
    const service = new AdvertisingService(repository as any);
    await expect(service.create({ businessId: 'business-1', name: 'Campaign', targetUrl: 'https://example.com', startAt: new Date('2026-10-02'), endAt: new Date('2026-10-01'), budget: 10, placements: ['HOME_BANNER'] })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('delegates date-filtered active ads and counts impressions and clicks', async () => {
    const repository = { create: vi.fn(), findActive: vi.fn().mockResolvedValue([{ id: 'campaign-1' }]), setStatus: vi.fn(), listByBusiness: vi.fn(), recordImpression: vi.fn(), recordClick: vi.fn() };
    const service = new AdvertisingService(repository as any);
    await expect(service.active('HOME_BANNER', new Date('2026-10-01'))).resolves.toEqual([{ id: 'campaign-1' }]);
    await service.impression('campaign-1');
    await service.click('campaign-1');
    expect(repository.findActive).toHaveBeenCalledWith('HOME_BANNER', new Date('2026-10-01'));
    expect(repository.recordImpression).toHaveBeenCalledWith('campaign-1');
    expect(repository.recordClick).toHaveBeenCalledWith('campaign-1');
  });
});
