export type ProjectStatus =
  "DRAFT" | "PUBLISHED" | "SOLD_OUT" | "SUSPENDED" | "COMPLETED";
export type ReraStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "NOT_APPLICABLE"
  | "REJECTED"
  | "SUSPENDED"
  | "EXPIRED";
export type ProjectMediaType =
  "GALLERY" | "FLOOR_PLAN" | "BROCHURE" | "SITE_PLAN";
export type ProjectVerificationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED"
  | "EXPIRED";

export interface ProjectMedia {
  id: string;
  url: string;
  mediaType: ProjectMediaType;
  sortOrder: number;
}

export interface ProjectBuilderSummary {
  id: string;
  name: string;
  profileImage: string | null;
  verificationStatus:
    | "PENDING"
    | "UNDER_REVIEW"
    | "VERIFIED"
    | "REJECTED"
    | "SUSPENDED"
    | "EXPIRED";
}

export interface ProjectEntity {
  id: string;
  builderId: string;
  name: string;
  slug: string;
  description: string;
  propertyType: string;
  city: string;
  locality: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  areaFrom: number | null;
  areaTo: number | null;
  totalUnits: number;
  availableUnits: number;
  possessionDate: Date | null;
  status: ProjectStatus;
  reraNumber: string | null;
  reraStatus: ReraStatus;
  verificationStatus:
    | "PENDING"
    | "UNDER_REVIEW"
    | "VERIFIED"
    | "REJECTED"
    | "SUSPENDED"
    | "EXPIRED";
  viewCount: number;
  amenities: string[];
  media: ProjectMedia[];
  builder?: ProjectBuilderSummary;
  enquiriesCount?: number;
  createdAt: Date;
  updatedAt: Date;
  promoted?: boolean;
}

export interface ProjectMediaInput {
  id: string;
  mediaType: ProjectMediaType;
  sortOrder?: number;
}

export interface CreateProjectInput {
  builderId: string;
  name: string;
  description: string;
  propertyType: string;
  city: string;
  locality: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  areaFrom?: number | null;
  areaTo?: number | null;
  totalUnits: number;
  availableUnits: number;
  possessionDate?: Date | null;
  status?: ProjectStatus;
  reraNumber?: string | null;
  reraStatus?: ReraStatus;
  amenities?: string[];
  mediaRefs?: ProjectMediaInput[];
}

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, "builderId">>;

export interface ProjectSearchFilters {
  city?: string;
  locality?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  possessionStatus?: "READY" | "UPCOMING";
  verified?: boolean;
  reraStatus?: ReraStatus;
  page?: number;
  pageSize?: number;
}

export interface IProjectRepository {
  create(input: CreateProjectInput & { slug: string }): Promise<ProjectEntity>;
  findById(id: string): Promise<ProjectEntity | null>;
  findBySlugOrId(value: string): Promise<ProjectEntity | null>;
  findBySlug(slug: string): Promise<ProjectEntity | null>;
  update(id: string, input: UpdateProjectInput): Promise<ProjectEntity>;
  delete(id: string): Promise<void>;
  listForBuilder(builderId: string): Promise<ProjectEntity[]>;
  listAllForAdmin(): Promise<ProjectEntity[]>;
  search(
    filters: ProjectSearchFilters,
  ): Promise<{ items: ProjectEntity[]; total: number }>;
  incrementViews(id: string): Promise<void>;
  similar(project: ProjectEntity, limit: number): Promise<ProjectEntity[]>;
  updateModeration(
    id: string,
    input: {
      status?: ProjectStatus;
      verificationStatus?: ProjectVerificationStatus;
    },
  ): Promise<ProjectEntity>;
}
