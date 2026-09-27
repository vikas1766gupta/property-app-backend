export type AdPlacement = 'HOME_BANNER' | 'SEARCH_BANNER' | 'CITY_PAGE' | 'PROJECT_PAGE' | 'SIDEBAR';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface CampaignEntity { id: string; businessId: string; name: string; targetUrl: string; startAt: Date; endAt: Date; budget: number; status: CampaignStatus; impressions: number; clicks: number; ctr: number; placements: AdPlacement[]; }
export interface AdvertisingRepository {
  create(input: { businessId: string; name: string; targetUrl: string; startAt: Date; endAt: Date; budget: number; placements: AdPlacement[] }): Promise<CampaignEntity>;
  findActive(placement: AdPlacement, now: Date, city?: string): Promise<CampaignEntity[]>;
  setStatus(id: string, status: CampaignStatus): Promise<CampaignEntity>;
  listByBusiness(businessId: string): Promise<CampaignEntity[]>;
  listAll(): Promise<CampaignEntity[]>;
  recordImpression(id: string): Promise<void>;
  recordClick(id: string): Promise<void>;
}
