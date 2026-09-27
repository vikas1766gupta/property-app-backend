import { AdminBusinessRecord, AdminBusinessStatus, AdminBusinessUpdateRecord, AdminListingRecord, AdminListingStatus, AdminListingUpdateRecord } from "./admin.entity";
import { ProjectEntity, ProjectStatus } from "@modules/project/project.entity";

export interface IAdminRepository {
  listBusinesses(): Promise<AdminBusinessRecord[]>;
  verifyBusiness(id: string, status: AdminBusinessStatus): Promise<AdminBusinessUpdateRecord>;
  listAllListings(): Promise<AdminListingRecord[]>;
  updateListingStatus(id: string, status: AdminListingStatus): Promise<AdminListingUpdateRecord>;
  revenueReport(): Promise<unknown>;
  subscriptionReport(): Promise<unknown>;
  listProjects?(): Promise<ProjectEntity[]>;
  updateProject?(id: string, input: { status?: ProjectStatus; verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED" }): Promise<ProjectEntity>;
}