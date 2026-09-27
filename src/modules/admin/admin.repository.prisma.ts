import { PrismaClient } from "@prisma/client";
import { IAdminRepository } from "./admin.repository.interface";
import { AdminBusinessRecord, AdminBusinessStatus, AdminBusinessUpdateRecord, AdminListingRecord, AdminListingStatus, AdminListingUpdateRecord } from "./admin.entity";

export class AdminRepositoryPrisma implements IAdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listBusinesses(): Promise<AdminBusinessRecord[]> {
    return this.prisma.business.findMany({ include: { user: true } });
  }

  async verifyBusiness(id: string, status: AdminBusinessStatus): Promise<AdminBusinessUpdateRecord> {
    return this.prisma.business.update({
      where: { id },
      data: { verificationStatus: status },
    });
  }

  async listAllListings(): Promise<AdminListingRecord[]> {
    return this.prisma.property.findMany({ include: { business: true, images: true } });
  }

  async updateListingStatus(id: string, status: AdminListingStatus): Promise<AdminListingUpdateRecord> {
    return this.prisma.property.update({
      where: { id },
      data: { status },
    });
  }

  async revenueReport() {
    const totals = await this.prisma.payment.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    });
    return totals;
  }
}