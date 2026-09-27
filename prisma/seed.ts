import { PrismaClient, Role, BusinessAccountType, BusinessAccountType as AccountType, VerificationStatus, ListingStatus, ListingType, ProjectStatus, ReraStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed production");
}

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for non-production seeding`);
  return value;
};

const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, role: Role) {
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash: await bcrypt.hash(password, 12), role },
    create: { email, passwordHash: await bcrypt.hash(password, 12), role },
  });
}

async function upsertBusiness(userId: string, accountType: BusinessAccountType, companyName: string, city: string) {
  return prisma.business.upsert({
    where: { userId },
    update: { accountType, companyName, city, verificationStatus: VerificationStatus.VERIFIED },
    create: { userId, accountType, companyName, city, verificationStatus: VerificationStatus.VERIFIED },
  });
}

async function main() {
  const admin = await upsertUser(required("SEED_ADMIN_EMAIL"), required("SEED_ADMIN_PASSWORD"), Role.ADMIN);
  const brokerUser = await upsertUser(required("SEED_BROKER_EMAIL"), required("SEED_BROKER_PASSWORD"), Role.BUSINESS);
  const ownerUser = await upsertUser(required("SEED_OWNER_EMAIL"), required("SEED_OWNER_PASSWORD"), Role.BUSINESS);
  const builderUser = await upsertUser(required("SEED_BUILDER_EMAIL"), required("SEED_BUILDER_PASSWORD"), Role.BUSINESS);
  const broker = await upsertBusiness(brokerUser.id, AccountType.BROKER, "Sample Broker", "Bengaluru");
  const owner = await upsertBusiness(ownerUser.id, AccountType.OWNER, "Sample Owner", "Pune");
  const builder = await upsertBusiness(builderUser.id, AccountType.BUILDER, "Sample Builder", "Hyderabad");

  await prisma.property.upsert({
    where: { id: "seed-property-bengaluru" },
    update: { status: ListingStatus.PUBLISHED, city: "Bengaluru", amenities: ["Parking", "Gym", "Power Backup"] },
    create: { id: "seed-property-bengaluru", businessId: broker.id, listingType: ListingType.RENT, title: "Sample Koramangala Apartment", description: "Seed listing for local development.", price: 45000, status: ListingStatus.PUBLISHED, addressLine: "80 Feet Road", city: "Bengaluru", state: "Karnataka", country: "India", bedrooms: 2, bathrooms: 2, areaSqft: 1250, amenities: ["Parking", "Gym", "Power Backup"] },
  });
  await prisma.property.upsert({
    where: { id: "seed-property-pune" },
    update: { status: ListingStatus.PUBLISHED, city: "Pune", amenities: ["Lift", "Security", "Garden"] },
    create: { id: "seed-property-pune", businessId: owner.id, listingType: ListingType.SALE, title: "Sample Baner Home", description: "Seed listing for local development.", price: 12500000, status: ListingStatus.PUBLISHED, addressLine: "Baner Road", city: "Pune", state: "Maharashtra", country: "India", bedrooms: 3, bathrooms: 3, areaSqft: 1800, amenities: ["Lift", "Security", "Garden"] },
  });
  await prisma.project.upsert({
    where: { slug: "sample-hills-hyderabad" },
    update: { status: ProjectStatus.PUBLISHED, city: "Hyderabad", amenities: ["Clubhouse", "Pool", "Play Area"] },
    create: { builderId: builder.id, name: "Sample Hills", slug: "sample-hills-hyderabad", description: "Seed project for local development.", propertyType: "Apartment", city: "Hyderabad", locality: "Gachibowli", address: "Financial District", totalUnits: 120, availableUnits: 120, status: ProjectStatus.PUBLISHED, reraStatus: ReraStatus.NOT_APPLICABLE, amenities: ["Clubhouse", "Pool", "Play Area"] },
  });

  console.log(`Seeded admin ${admin.email}, broker ${broker.companyName}, owner ${owner.companyName}, builder ${builder.companyName}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
