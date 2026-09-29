import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@common/errors/AppError";
import {
  ReportEntity,
  ReportRepository,
  VerificationRecordEntity,
  VerificationRepository,
} from "./trust.entity";

export class TrustRepositoryPrisma
  implements VerificationRepository, ReportRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  findVerification(id: string): Promise<VerificationRecordEntity | null> {
    return this.prisma.verificationRecord.findUnique({ where: { id } });
  }

  async createVerification(
    input: Parameters<VerificationRepository["createVerification"]>[0],
  ): Promise<VerificationRecordEntity> {
    return this.prisma.verificationRecord.create({ data: input });
  }

  async review(
    id: string,
    input: {
      status: VerificationRecordEntity["status"];
      reviewedBy: string;
      reason?: string;
      notes?: string;
    },
  ): Promise<VerificationRecordEntity> {
    const existing = await this.prisma.verificationRecord.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundError("Verification record not found");
    const result = await this.prisma.$transaction(async (transaction) => {
      if (existing.entityType === "BUSINESS")
        await transaction.business.update({
          where: { id: existing.entityId },
          data: { verificationStatus: input.status },
        });
      if (existing.entityType === "PROPERTY")
        await transaction.property.update({
          where: { id: existing.entityId },
          data: { verificationStatus: input.status },
        });
      if (existing.entityType === "PROJECT") {
        if (existing.verificationType === "RERA")
          await transaction.project.update({
            where: { id: existing.entityId },
            data: {
              reraStatus:
                input.status === "VERIFIED" ? "VERIFIED" : input.status,
            },
          });
        else
          await transaction.project.update({
            where: { id: existing.entityId },
            data: { verificationStatus: input.status },
          });
      }
      return transaction.verificationRecord.update({
        where: { id },
        data: {
          status: input.status,
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date(),
          reason: input.reason,
          notes: input.notes,
        },
      });
    });
    return result;
  }

  async createReport(
    input: Parameters<ReportRepository["createReport"]>[0],
  ): Promise<ReportEntity> {
    if (
      input.entityType === "BUSINESS" &&
      !(await this.prisma.business.findUnique({
        where: { id: input.entityId },
        select: { id: true },
      }))
    )
      throw new NotFoundError("Business not found");
    if (
      input.entityType === "PROPERTY" &&
      !(await this.prisma.property.findUnique({
        where: { id: input.entityId },
        select: { id: true },
      }))
    )
      throw new NotFoundError("Property not found");
    if (
      input.entityType === "PROJECT" &&
      !(await this.prisma.project.findUnique({
        where: { id: input.entityId },
        select: { id: true },
      }))
    )
      throw new NotFoundError("Project not found");
    return this.prisma.report.create({ data: input });
  }

  async list(status?: ReportEntity["status"]): Promise<ReportEntity[]> {
    return this.prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  async moderate(
    id: string,
    input: {
      status: ReportEntity["status"];
      reviewedBy: string;
      notes?: string;
    },
  ): Promise<ReportEntity> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundError("Report not found");
    return this.prisma.$transaction(async (transaction) => {
      if (input.status === "SUSPENDED") {
        await transaction.verificationRecord.create({
          data: {
            entityType: report.entityType,
            entityId: report.entityId,
            verificationType: report.entityType,
            status: "SUSPENDED",
            reviewedBy: input.reviewedBy,
            reviewedAt: new Date(),
            notes: input.notes,
          },
        });
        if (report.entityType === "BUSINESS")
          await transaction.business.update({
            where: { id: report.entityId },
            data: { verificationStatus: "SUSPENDED" },
          });
        if (report.entityType === "PROPERTY")
          await transaction.property.update({
            where: { id: report.entityId },
            data: { verificationStatus: "SUSPENDED" },
          });
        if (report.entityType === "PROJECT")
          await transaction.project.update({
            where: { id: report.entityId },
            data: { verificationStatus: "SUSPENDED" },
          });
      }
      return transaction.report.update({
        where: { id },
        data: {
          status: input.status,
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date(),
        },
      });
    });
  }
}
