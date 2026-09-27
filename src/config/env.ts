import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
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
  port: Number(process.env.PORT || 4000),
  databaseUrl,
  jwtSecret: required("JWT_SECRET"),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:4200",
};
