import { Request, Response } from 'express';
import { z } from 'zod';
import { BadRequestError, ForbiddenError } from '@common/errors/AppError';
import { PaymentService } from '@modules/payment/payment.service';
import { PromotionService } from './promotion.service';
import { AdPlacement, CampaignStatus } from './advertising.entity';
import { AdvertisingService } from './advertising.service';

const promotionType = z.enum(['FEATURED', 'PREMIUM', 'HOMEPAGE', 'SEARCH_PRIORITY']);
const placement = z.enum(['HOME_BANNER', 'SEARCH_BANNER', 'CITY_PAGE', 'PROJECT_PAGE', 'SIDEBAR']);
export class PromotionController {
  constructor(private readonly promotions: PromotionService, private readonly advertising: AdvertisingService, private readonly payments: PaymentService) {}
  configs = async (_req: Request, res: Response) => res.json(await this.promotions.listConfigs());
  saveConfig = async (req: Request, res: Response) => {
    const parsed = z.object({ type: promotionType, price: z.number().nonnegative(), durationDays: z.number().int().positive(), allowedCustomerTypes: z.array(z.enum(['OWNER', 'BROKER', 'BUILDER'])), priorityWeight: z.number().int().nonnegative(), isActive: z.boolean() }).safeParse(req.body);
    if (!parsed.success) throw new BadRequestError('Invalid promotion configuration');
    res.json(await this.promotions.saveConfig(parsed.data));
  };
  mine = async (req: Request, res: Response) => res.json(await this.promotions.listMine(this.businessId(req)));
  purchase = async (req: Request, res: Response) => {
    const parsed = z.object({ targetType: z.enum(['PROPERTY', 'PROJECT']), targetId: z.string().min(1), type: promotionType }).safeParse(req.body);
    if (!parsed.success) throw new BadRequestError('Invalid promotion request');
    const result = await this.promotions.purchase({ ...parsed.data, businessId: this.businessId(req), customerType: 'OWNER' });
    const checkout = result.config.price > 0 ? await this.payments.createPromotionPaymentIntent(this.businessId(req), result.promotion.id, result.config.price, 'INR') : null;
    if (checkout) await this.promotions.attachPayment(result.promotion.id, checkout.paymentId);
    res.status(201).json({ ...result, checkout });
  };
  createCampaign = async (req: Request, res: Response) => {
    const parsed = z.object({ businessId: z.string().min(1).optional(), name: z.string().min(1), targetUrl: z.string().url(), startAt: z.coerce.date(), endAt: z.coerce.date(), budget: z.number().positive(), placements: z.array(placement).min(1) }).safeParse(req.body);
    if (!parsed.success) throw new BadRequestError('Invalid campaign request');
    const businessId = req.auth?.businessId ?? parsed.data.businessId;
    if (!businessId) throw new ForbiddenError('Advertiser businessId is required');
    res.status(201).json(await this.advertising.create({ ...parsed.data, businessId }));
  };
  campaigns = async (req: Request, res: Response) => res.json(await this.advertising.listMine(this.businessId(req)));
  adminCampaigns = async (_req: Request, res: Response) => res.json(await this.advertising.listAll());
  campaignStatus = async (req: Request, res: Response) => res.json(await this.advertising.setStatus(req.params.id, req.body.status as CampaignStatus));
  activeAds = async (req: Request, res: Response) => res.json(await this.advertising.active(req.query.placement as AdPlacement));
  impression = async (req: Request, res: Response) => { await this.advertising.impression(req.params.id); res.status(204).send(); };
  click = async (req: Request, res: Response) => { await this.advertising.click(req.params.id); res.status(204).send(); };
  private businessId(req: Request): string { if (!req.auth?.businessId) throw new ForbiddenError('Business account required'); return req.auth.businessId; }
}
