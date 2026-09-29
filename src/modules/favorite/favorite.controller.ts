import { Request, Response } from "express";
import { z } from "zod";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";
import { FavoriteService } from "./favorite.service";

const propertyIdSchema = z.string().min(1).max(64);

export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  add = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) throw new ForbiddenError("Buyer account required");
    const parsed = propertyIdSchema.safeParse(req.params.propertyId);
    if (!parsed.success) throw new BadRequestError("Invalid property id");
    const favorite = await this.favoriteService.addFavorite(
      userId,
      parsed.data,
    );
    res.json({ ...favorite, isFavorited: true });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) throw new ForbiddenError("Buyer account required");
    const parsed = propertyIdSchema.safeParse(req.params.propertyId);
    if (!parsed.success) throw new BadRequestError("Invalid property id");
    res.json(await this.favoriteService.removeFavorite(userId, parsed.data));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) throw new ForbiddenError("Buyer account required");
    res.json(await this.favoriteService.listByUser(userId));
  };
}
