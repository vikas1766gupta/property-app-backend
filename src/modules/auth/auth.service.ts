import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUserRepository } from "./auth.entity";
import { ConflictError, UnauthorizedError } from "@common/errors/AppError";

export class AuthService {
  constructor(private readonly userRepo: IUserRepository, private readonly jwtSecret: string) {}

  async registerBusiness(email: string, password: string, companyName: string, contactPhone?: string) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new ConflictError("Email already registered");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepo.createBusinessUser({ email, passwordHash, companyName, contactPhone });
    return this.issueToken(user.id, user.role, user.businessId);
  }

  async registerBuyer(email: string, password?: string) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new ConflictError("Email already registered");

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const user = await this.userRepo.createBuyerUser({ email, passwordHash });
    return this.issueToken(user.id, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.passwordHash) throw new UnauthorizedError("Invalid credentials");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid credentials");

    return this.issueToken(user.id, user.role, user.businessId);
  }

  private issueToken(userId: string, role: string, businessId?: string) {
    const token = jwt.sign({ userId, role, businessId }, this.jwtSecret, { expiresIn: "7d" });
    return { token };
  }
}
