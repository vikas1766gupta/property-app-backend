import { BadRequestError, ForbiddenError, NotFoundError } from '@common/errors/AppError';
import { AdPlacement, AdvertisingRepository, CampaignEntity, CampaignStatus } from './advertising.entity';

export class AdvertisingService {
  constructor(private readonly repo: AdvertisingRepository) {}
  async create(input: { businessId: string; name: string; targetUrl: string; startAt: Date; endAt: Date; budget: number; placements: AdPlacement[] }): Promise<CampaignEntity> {
    if (!input.name.trim() || !input.targetUrl.trim() || input.endAt <= input.startAt || input.budget <= 0 || !input.placements.length) throw new BadRequestError('Invalid campaign');
    return this.repo.create(input);
  }
  async setStatus(id: string, status: CampaignStatus): Promise<CampaignEntity> { try { return await this.repo.setStatus(id, status); } catch { throw new NotFoundError('Campaign not found'); } }
  listMine(businessId: string): Promise<CampaignEntity[]> { return this.repo.listByBusiness(businessId); }
  listAll(): Promise<CampaignEntity[]> { return this.repo.listAll(); }
  async active(placement: AdPlacement, now = new Date()): Promise<CampaignEntity[]> { return this.repo.findActive(placement, now); }
  async impression(id: string): Promise<void> { await this.repo.recordImpression(id); }
  async click(id: string): Promise<void> { await this.repo.recordClick(id); }
}
