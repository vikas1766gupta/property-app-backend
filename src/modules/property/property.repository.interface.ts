import { PropertyEntity, CreatePropertyInput, PropertyImageReference, PropertySearchFilters, ListingStatus, UpdatePropertyInput, DuplicatePropertyInput } from "./property.entity";

/**
 * Repository interface (port). Services depend on THIS, never on a concrete
 * ORM/DB implementation (Dependency Inversion). Swapping Postgres/Prisma for
 * Mongo/Mongoose later means writing a new class that implements this
 * interface — nothing in property.service.ts has to change.
 */
export interface IPropertyRepository {
  create(input: CreatePropertyInput): Promise<PropertyEntity>;
  createImageUpload(input: { businessId: string; publicId: string; url: string }): Promise<PropertyImageReference>;
  findById(id: string): Promise<PropertyEntity | null>;
  search(filters: PropertySearchFilters): Promise<{ items: PropertyEntity[]; total: number }>;
  update(id: string, businessId: string, patch: UpdatePropertyInput): Promise<PropertyEntity>;
  updateStatus(id: string, status: ListingStatus): Promise<PropertyEntity>;
  delete(id: string): Promise<void>;
  countByBusiness(businessId: string): Promise<number>;
  listByBusiness(businessId: string): Promise<PropertyEntity[]>;
  findPotentialDuplicates?(input: DuplicatePropertyInput): Promise<PropertyEntity[]>;
  markDuplicate?(id: string, reason: string): Promise<PropertyEntity>;
}
