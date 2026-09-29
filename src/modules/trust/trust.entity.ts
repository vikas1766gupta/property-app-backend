export type VerificationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED"
  | "EXPIRED";
export type VerificationEntityType = "BUSINESS" | "PROPERTY" | "PROJECT";
export type VerificationType = "BUSINESS" | "PROPERTY" | "PROJECT" | "RERA";
export type ReportReason =
  | "FAKE_PROPERTY"
  | "WRONG_PRICE"
  | "DUPLICATE"
  | "SPAM"
  | "SCAM"
  | "WRONG_INFORMATION"
  | "OTHER";
export type ReportStatus =
  "OPEN" | "UNDER_REVIEW" | "DISMISSED" | "SUSPENDED" | "REJECTED" | "RESOLVED";

export interface VerificationRecordEntity {
  id: string;
  entityType: VerificationEntityType;
  entityId: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportEntity {
  id: string;
  reporterId: string | null;
  entityType: VerificationEntityType;
  entityId: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationRepository {
  findVerification(id: string): Promise<VerificationRecordEntity | null>;
  createVerification(input: {
    entityType: VerificationEntityType;
    entityId: string;
    verificationType: VerificationType;
    status?: VerificationStatus;
    reason?: string;
    notes?: string;
  }): Promise<VerificationRecordEntity>;
  review(
    id: string,
    input: {
      status: VerificationStatus;
      reviewedBy: string;
      reason?: string;
      notes?: string;
    },
  ): Promise<VerificationRecordEntity>;
}

export interface ReportRepository {
  createReport(input: {
    reporterId?: string;
    entityType: VerificationEntityType;
    entityId: string;
    reason: ReportReason;
    description: string;
  }): Promise<ReportEntity>;
  list(status?: ReportStatus): Promise<ReportEntity[]>;
  moderate(
    id: string,
    input: { status: ReportStatus; reviewedBy: string; notes?: string },
  ): Promise<ReportEntity>;
}
