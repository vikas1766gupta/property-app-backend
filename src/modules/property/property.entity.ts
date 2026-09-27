export type ListingType = "RENT" | "SALE";
export type ListingStatus = "DRAFT" | "PENDING_PAYMENT" | "PUBLISHED" | "FLAGGED" | "REMOVED";

/**
 * Domain entity. Deliberately has ZERO dependency on Prisma (or any ORM) so
 * that Services/Controllers can be unit-tested and reasoned about without
 * knowing which database is behind the Repository.
 */
export class PropertyEntity {
  constructor(
    public id: string,
    public businessId: string,
    public listingType: ListingType,
    public title: string,
    public description: string,
    public price: number,
    public currency: string,
    public status: ListingStatus,
    public city: string,
    public state: string,
    public country: string,
    public addressLine: string,
    public bedrooms: number | null,
    public bathrooms: number | null,
    public areaSqft: number | null,
    public furnishingStatus: string | null,
    public amenities: string[],
    public images: string[],
    public isFreeListing: boolean,
    public createdAt: Date,
    public latitude?: number | null,
    public longitude?: number | null
  ) {}
}

export interface CreatePropertyInput {
  businessId: string;
  listingType: ListingType;
  title: string;
  description: string;
  price: number;
  currency?: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
  furnishingStatus?: string;
  amenities?: string[];
  imageUrls?: string[];
}

export type UpdatePropertyInput = Partial<
  Omit<CreatePropertyInput, "businessId" | "latitude" | "longitude" | "bedrooms" | "bathrooms" | "areaSqft" | "furnishingStatus">
> & {
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqft?: number | null;
  furnishingStatus?: string | null;
};

export interface PropertySearchFilters {
  city?: string;
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  amenities?: string[];
  page?: number;
  pageSize?: number;
}
