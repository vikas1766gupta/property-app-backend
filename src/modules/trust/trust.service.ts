import { BadRequestError, NotFoundError } from "@common/errors/AppError";
import { ReportEntity, ReportReason, ReportRepository, ReportStatus, VerificationEntityType, VerificationRepository, VerificationStatus, VerificationType } from "./trust.entity";

const transitions: Record<VerificationStatus, VerificationStatus[]> = { PENDING: ["UNDER_REVIEW", "REJECTED"], UNDER_REVIEW: ["VERIFIED", "REJECTED", "SUSPENDED"], VERIFIED: ["SUSPENDED", "EXPIRED"], REJECTED: ["UNDER_REVIEW"], SUSPENDED: ["UNDER_REVIEW", "REJECTED"], EXPIRED: ["UNDER_REVIEW"] };

export class TrustService {
  constructor(private readonly verificationRepo: VerificationRepository, private readonly reportRepo: ReportRepository) {}

  createVerification(input: { entityType: VerificationEntityType; entityId: string; verificationType: VerificationType; status?: VerificationStatus; reason?: string; notes?: string }) { return this.verificationRepo.createVerification(input); }

  async reviewVerification(id: string, input: { status: VerificationStatus; reviewedBy: string; reason?: string; notes?: string }) {
    const current = await this.verificationRepo.findVerification(id);
    if (!current) throw new NotFoundError("Verification record not found");
    if (current.status !== input.status && !transitions[current.status].includes(input.status)) throw new BadRequestError(`Cannot move verification from ${current.status} to ${input.status}`);
    return this.verificationRepo.review(id, input);
  }

  createReport(input: { reporterId?: string; entityType: VerificationEntityType; entityId: string; reason: ReportReason; description: string }) { return this.reportRepo.createReport(input); }
  listReports(status?: ReportStatus) { return this.reportRepo.list(status); }
  moderateReport(id: string, input: { status: ReportStatus; reviewedBy: string; notes?: string }) { return this.reportRepo.moderate(id, input); }
}