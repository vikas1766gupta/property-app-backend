import { Request, Response } from "express";
import { z } from "zod";
import { PropertyService } from "./property.service";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";

const createPropertySchema = z.object({
  listingType: z.enum(["RENT", "SALE"]),
  title: z.string().min(5).max(150),
  description: z.string().min(20),
  price: z.number().positive(),
  currency: z.string().length(3).optional(),
  addressLine: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  areaSqft: z.number().int().positive().optional(),
  furnishingStatus: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  imageUrls: z.array(z.string().url()).max(20).optional(),
});

const updatePropertySchema = createPropertySchema
  .partial()
  .extend({
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    bedrooms: z.number().int().nonnegative().nullable().optional(),
    bathrooms: z.number().int().nonnegative().nullable().optional(),
    areaSqft: z.number().int().positive().nullable().optional(),
    furnishingStatus: z.string().nullable().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, "At least one property field must be provided");

const searchSchema = z.object({
  city: z.string().optional(),
  listingType: z.enum(["RENT", "SALE"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minBedrooms: z.coerce.number().optional(),
  amenities: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : v.split(",")) : undefined)),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

/** HTTP layer only: parses/validates the request, calls the service, shapes the response. No business logic here. */
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId) throw new ForbiddenError("Business account required");
    const parsed = createPropertySchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError("Invalid listing payload", parsed.error.flatten());

    const { property, requiresPayment } = await this.propertyService.createListing({
      ...parsed.data,
      businessId: req.auth.businessId,
    });

    res.status(201).json({
      property,
      requiresPayment,
      message: requiresPayment
        ? "Free tier used up — complete payment to publish this listing."
        : "Listing published.",
    });
  };

  search = async (req: Request, res: Response): Promise<void> => {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) throw new BadRequestError("Invalid search params", parsed.error.flatten());
    const result = await this.propertyService.search(parsed.data);
    res.json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const property = await this.propertyService.getPublicListing(req.params.id);
    res.json(property);
  };

  myListings = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId) throw new ForbiddenError("Business account required");
    const listings = await this.propertyService.listForBusiness(req.auth.businessId);
    res.json(listings);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId) throw new ForbiddenError("Business account required");
    const parsed = updatePropertySchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError("Invalid property update", parsed.error.flatten());
    const updated = await this.propertyService.updateListing(req.params.id, req.auth.businessId, parsed.data);
    res.json(updated);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId) throw new ForbiddenError("Business account required");
    await this.propertyService.deleteListing(req.params.id, req.auth.businessId);
    res.status(204).send();
  };

  freeListingsRemaining = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId) throw new ForbiddenError("Business account required");
    const remaining = await this.propertyService.remainingFreeListings(req.auth.businessId);
    res.json({ remaining });
  };
}
