import { PrismaClient } from "@prisma/client";
import { IUserRepository, UserEntity } from "./auth.entity";

export class UserRepositoryPrisma implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { email }, include: { business: true } });
    if (!row) return null;
    return new UserEntity(row.id, row.email, row.role, row.passwordHash, row.business?.id);
  }

  async createBusinessUser(data: { email: string; passwordHash: string; companyName: string; contactPhone?: string }) {
    const row = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: "BUSINESS",
        business: { create: { companyName: data.companyName, contactPhone: data.contactPhone } },
      },
      include: { business: true },
    });
    return new UserEntity(row.id, row.email, row.role, row.passwordHash, row.business?.id);
  }

  async createBuyerUser(data: { email: string; passwordHash: string | null }) {
    const row = await this.prisma.user.create({
      data: { email: data.email, passwordHash: data.passwordHash, role: "BUYER" },
    });
    return new UserEntity(row.id, row.email, row.role, row.passwordHash);
  }

  async createAdminUser(data: { email: string; passwordHash: string }) {
    const row = await this.prisma.user.create({
      data: { email: data.email, passwordHash: data.passwordHash, role: "ADMIN" },
    });
    return new UserEntity(row.id, row.email, row.role, row.passwordHash);
  }
}
