export type Role = "BUSINESS" | "BUYER" | "ADMIN";

export class UserEntity {
  constructor(
    public id: string,
    public email: string,
    public role: Role,
    public passwordHash: string | null,
    public businessId?: string,
  ) {}
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  createBusinessUser(data: {
    email: string;
    passwordHash: string;
    companyName: string;
    contactPhone?: string;
  }): Promise<UserEntity>;
  createBuyerUser(data: {
    email: string;
    passwordHash: string | null;
  }): Promise<UserEntity>;
  createAdminUser(data: {
    email: string;
    passwordHash: string;
  }): Promise<UserEntity>;
}
