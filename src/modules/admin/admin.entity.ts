export type AdminBusinessStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED"
  | "EXPIRED";
export type AdminListingStatus =
  "DRAFT" | "PENDING_PAYMENT" | "PUBLISHED" | "FLAGGED" | "REMOVED";
export type AdminUserRole = "BUSINESS" | "BUYER" | "ADMIN";

export interface AdminBusinessUpdateRecord {
  id: string;
  userId: string;
  companyName: string;
  contactPhone: string | null;
  verificationStatus: AdminBusinessStatus;
  freeListingsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  role: AdminUserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminBusinessRecord extends AdminBusinessUpdateRecord {
  user: AdminUserRecord;
}

export interface AdminListingImageRecord {
  id: string;
  propertyId: string | null;
  businessId: string;
  publicId: string | null;
  url: string;
  sortOrder: number;
  isCover: boolean;
}

export interface AdminListingUpdateRecord {
  id: string;
  businessId: string;
  listingType: "RENT" | "SALE";
  title: string;
  description: string;
  price: unknown;
  currency: string;
  status: AdminListingStatus;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  furnishingStatus: string | null;
  amenities: string[];
  isFreeListing: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminListingBusinessRecord {
  id: string;
  userId: string;
  companyName: string;
  contactPhone: string | null;
  verificationStatus: AdminBusinessStatus;
  freeListingsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminListingRecord extends AdminListingUpdateRecord {
  business: AdminListingBusinessRecord;
  images: AdminListingImageRecord[];
}
