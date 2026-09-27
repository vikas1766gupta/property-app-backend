import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "./auth.service";
import { BadRequestError } from "@common/errors/AppError";

const registerBusinessSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  contactPhone: z.string().optional(),
});

const registerBuyerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(), // optional for OAuth-based signup handled elsewhere
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  registerBusiness = async (req: Request, res: Response): Promise<void> => {
    const parsed = registerBusinessSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError("Invalid payload", parsed.error.flatten());
    const { email, password, companyName, contactPhone } = parsed.data;
    res.status(201).json(await this.authService.registerBusiness(email, password, companyName, contactPhone));
  };

  registerBuyer = async (req: Request, res: Response): Promise<void> => {
    const parsed = registerBuyerSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError("Invalid payload", parsed.error.flatten());
    res.status(201).json(await this.authService.registerBuyer(parsed.data.email, parsed.data.password));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError("Invalid payload", parsed.error.flatten());
    res.json(await this.authService.login(parsed.data.email, parsed.data.password));
  };
}
