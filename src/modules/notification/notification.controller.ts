import { Request, Response } from "express";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";
import { NotificationService } from "./notification.service";
import { z } from "zod";

const preferencesSchema = z.object({
  emailEnabled: z.boolean(), leadEmails: z.boolean(), propertyAlertEmails: z.boolean(), paymentEmails: z.boolean(), marketingEmails: z.boolean(),
}).strict().partial();

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  listMine = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) throw new ForbiddenError("Buyer account required");
    res.json(await this.notificationService.listForUser(req.auth.userId));
  };

  getPreferences = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) throw new ForbiddenError("Authentication required");
    res.json(await this.notificationService.getPreferences(req.auth.userId));
  };

  updatePreferences = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) throw new ForbiddenError("Authentication required");
    const parsed = preferencesSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError("Invalid notification preferences", parsed.error.flatten());
    res.json(await this.notificationService.updatePreferences(req.auth.userId, parsed.data));
  };
}