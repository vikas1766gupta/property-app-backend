import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

const databaseUrl = required("DATABASE_URL");
if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error(
    "DATABASE_URL must be a PostgreSQL connection string starting with postgresql:// or postgres://; see .env.example"
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: positiveInteger("PORT", 4000),
  databaseUrl,
  jwtSecret: required("JWT_SECRET"),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:4200",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: positiveInteger("SMTP_PORT", 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPassword: process.env.SMTP_PASSWORD || "",
  smtpFrom: process.env.SMTP_FROM || "",
};

if (env.nodeEnv === "production") {
  if (env.jwtSecret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters in production");
  if (env.corsOrigin === "*") throw new Error("CORS_ORIGIN must be an explicit origin in production");
}
