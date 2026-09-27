import { ForbiddenError, NotFoundError } from "@common/errors/AppError";
import { BusinessProfile, IBusinessRepository } from "@modules/business/business.entity";
import { CreateProjectInput, IProjectRepository, ProjectEntity, ProjectSearchFilters, UpdateProjectInput } from "./project.entity";

export class ProjectService {
  constructor(private readonly projectRepo: IProjectRepository, private readonly businessRepo: IBusinessRepository) {}

  private async requireBuilder(builderId: string): Promise<BusinessProfile> {
    const business = await this.businessRepo.findById(builderId);
    if (!business) throw new NotFoundError("Builder profile not found");
    if (business.accountType !== "BUILDER") throw new ForbiddenError("Builder account required");
    return business;
  }

  private slugify(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "project";
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = this.slugify(name);
    let slug = base;
    let suffix = 2;
    while (await this.projectRepo.findBySlug(slug)) slug = `${base}-${suffix++}`;
    return slug;
  }

  async create(input: CreateProjectInput): Promise<ProjectEntity> {
    await this.requireBuilder(input.builderId);
    return this.projectRepo.create({ ...input, slug: await this.uniqueSlug(`${input.name}-${input.city}`) });
  }

  async getPublic(value: string): Promise<{ project: ProjectEntity; similar: ProjectEntity[] }> {
    const project = await this.projectRepo.findBySlugOrId(value);
    if (!project || !["PUBLISHED", "SOLD_OUT", "COMPLETED"].includes(project.status) || project.verificationStatus !== "VERIFIED") throw new NotFoundError("Project not found");
    await this.projectRepo.incrementViews(project.id);
    return { project: { ...project, viewCount: project.viewCount + 1 }, similar: await this.projectRepo.similar(project, 4) };
  }

  search(filters: ProjectSearchFilters) { return this.projectRepo.search(filters); }

  listForBuilder(builderId: string) { return this.projectRepo.listForBuilder(builderId); }

  async update(id: string, builderId: string, input: UpdateProjectInput): Promise<ProjectEntity> {
    await this.requireBuilder(builderId);
    const existing = await this.projectRepo.findById(id);
    if (!existing) throw new NotFoundError("Project not found");
    if (existing.builderId !== builderId) throw new ForbiddenError("Not your project");
    return this.projectRepo.update(id, input);
  }

  async remove(id: string, builderId: string): Promise<void> {
    await this.requireBuilder(builderId);
    const existing = await this.projectRepo.findById(id);
    if (!existing) throw new NotFoundError("Project not found");
    if (existing.builderId !== builderId) throw new ForbiddenError("Not your project");
    await this.projectRepo.delete(id);
  }

  moderation(id: string, input: { status?: ProjectEntity["status"]; verificationStatus?: ProjectEntity["verificationStatus"] }) {
    return this.projectRepo.updateModeration(id, input);
  }
}