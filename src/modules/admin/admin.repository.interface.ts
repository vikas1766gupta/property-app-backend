import { AdminBusinessRecord, AdminBusinessStatus, AdminBusinessUpdateRecord, AdminListingRecord, AdminListingStatus, AdminListingUpdateRecord } from "./admin.entity";

export interface IAdminRepository {
  listBusinesses(): Promise<AdminBusinessRecord[]>;
  verifyBusiness(id: string, status: AdminBusinessStatus): Promise<AdminBusinessUpdateRecord>;
  listAllListings(): Promise<AdminListingRecord[]>;
  updateListingStatus(id: string, status: AdminListingStatus): Promise<AdminListingUpdateRecord>;
  revenueReport(): Promise<unknown>;
}