import express from "express";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { errorHandlerMiddleware } from "@common/middleware/errorHandler.middleware";
import { TrustController } from "./trust.controller";
import { trustRoutes } from "./trust.routes";

describe("trust route authorization", () => {
  it("protects admin reports while allowing anonymous report submission", async () => {
    const service = {
      createReport: async () => ({ id: "report-1" }),
      listReports: async () => [],
      moderateReport: async () => ({}),
      reviewVerification: async () => ({}),
      createVerification: async () => ({}),
    };
    const app = express();
    app.use(express.json());
    app.use("/api", trustRoutes(new TrustController(service as any)));
    app.use(errorHandlerMiddleware);
    process.env.JWT_SECRET = "trust-test-secret";
    const buyerToken = jwt.sign(
      { userId: "buyer-1", role: "BUYER" },
      process.env.JWT_SECRET,
    );
    expect((await request(app, "/api/admin/reports", "GET")).status).toBe(401);
    expect(
      (await request(app, "/api/admin/reports", "GET", buyerToken)).status,
    ).toBe(403);
  });
});

async function request(
  app: express.Express,
  path: string,
  method: string,
  token?: string,
): Promise<Response> {
  const server = app.listen(0);
  const address = server.address() as { port: number };
  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
