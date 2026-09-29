import { Request, Response } from "express";
import { z } from "zod";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";
import { SavedSearchService } from "./saved-search.service";

const savedSearchSchema = z.object({
  name: z.string().trim().min(1).max(60),
  notifyOnMatch: z.boolean().default(false),
  filters: z
    .object({
      city: z.string().trim().min(1).optional(),
      listingType: z.enum(["RENT", "SALE"]).optional(),
      minPrice: z.number().nonnegative().optional(),
      maxPrice: z.number().nonnegative().optional(),
      minBedrooms: z.number().int().nonnegative().optional(),
      amenities: z.array(z.string()).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      radiusKm: z.number().positive().max(100).optional(),
    })
    .strict()
    .superRefine((filters, context) => {
      const hasGeo =
        filters.latitude !== undefined ||
        filters.longitude !== undefined ||
        filters.radiusKm !== undefined;
      if (
        hasGeo &&
        (filters.latitude === undefined ||
          filters.longitude === undefined ||
          filters.radiusKm === undefined)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Radius search requires latitude, longitude, and radiusKm",
        });
      }
      if (
        filters.minPrice !== undefined &&
        filters.maxPrice !== undefined &&
        filters.minPrice > filters.maxPrice
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum price cannot exceed maximum price",
        });
      }
    }),
});

export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) throw new ForbiddenError("Buyer account required");
    const parsed = savedSearchSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError("Invalid saved search", parsed.error.flatten());
    res
      .status(201)
      .json(await this.savedSearchService.create(req.auth.userId, parsed.data));
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) throw new ForbiddenError("Buyer account required");
    res.json(await this.savedSearchService.list(req.auth.userId));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) throw new ForbiddenError("Buyer account required");
    await this.savedSearchService.remove(req.auth.userId, req.params.id);
    res.status(204).send();
  };
}
