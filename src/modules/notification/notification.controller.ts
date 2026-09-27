import { Request, Response } from "express";
import { ForbiddenError } from "@common/errors/AppError";
import { NotificationService } from "./notification.service";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  listMine = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) throw new ForbiddenError("Buyer account required");
    res.json(await this.notificationService.listForUser(req.auth.userId));
  };
}