export type BusinessAccountType = "OWNER" | "BROKER" | "BUILDER";
export type BusinessVerificationStatus = "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "SUSPENDED" | "EXPIRED";

export interface BusinessStats {
  activePropertyCount: number;
  saleListingsCount: number;
  rentalListingsCount: number;
  commercialListingsCount: number;
  projectsCount: number;
  activeProjectsCount: number;
}

export interface BusinessProfile {
  id: string;
  accountType: BusinessAccountType;
  displayName: string | null;
  companyName: string;
  profileImage: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  phone: string | null;
  email: string;
  website: string | null;
  verificationStatus: BusinessVerificationStatus;
  city: string | null;
  servedLocalities: string[];
  createdAt: Date;
  updatedAt: Date;
  stats: BusinessStats;
}

export interface BusinessProfileUpdate {
  accountType?: BusinessAccountType;
  displayName?: string | null;
  companyName?: string;
  profileImage?: string | null;
  bio?: string | null;
  yearsOfExperience?: number | null;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  servedLocalities?: string[];
}

export interface BusinessPropertySummary {
  id: string;
  title: string;
  listingType: "RENT" | "SALE";
  city: string;
  state: string;
  price: number;
  currency: string;
  images: string[];
}

export interface IBusinessRepository {
  findById(id: string): Promise<BusinessProfile | null>;
  findAll(): Promise<BusinessProfile[]>;
  update(id: string, input: BusinessProfileUpdate): Promise<BusinessProfile>;
  listPublishedProperties(id: string): Promise<BusinessPropertySummary[]>;
}
