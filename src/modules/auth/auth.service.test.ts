import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response } from "express";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { requireAuth } from "@common/middleware/auth.middleware";
import { UnauthorizedError } from "@common/errors/AppError";
import { IUserRepository, UserEntity } from "./auth.entity";
import { AuthService } from "./auth.service";

const secret = "auth-service-test-secret";
const originalJwtSecret = process.env.JWT_SECRET;
let repository: IUserRepository;
let service: AuthService;

beforeAll(() => {
  process.env.JWT_SECRET = secret;
});

afterAll(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

beforeEach(() => {
  repository = {
    findByEmail: vi.fn(),
    createBusinessUser: vi.fn(),
    createBuyerUser: vi.fn(),
    createAdminUser: vi.fn(),
  };
  service = new AuthService(repository, secret);
});

function verifyToken(token: string) {
  return jwt.verify(token, secret) as JwtPayload & {
    userId: string;
    role: string;
    businessId?: string;
  };
}

describe("AuthService", () => {
  it("registers businesses with a password hash and issues a role-bearing JWT", async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null);
    vi.mocked(repository.createBusinessUser).mockImplementation(
      async ({ email, passwordHash }) =>
        new UserEntity("user-1", email, "BUSINESS", passwordHash, "business-1"),
    );

    const result = await service.registerBusiness(
      "agent@example.com",
      "secure-pass",
      "Estate Co",
      "+1000",
    );
    const userData = vi.mocked(repository.createBusinessUser).mock.calls[0][0];
    const claims = verifyToken(result.token);

    expect(await bcrypt.compare("secure-pass", userData.passwordHash)).toBe(
      true,
    );
    expect(claims).toMatchObject({
      userId: "user-1",
      role: "BUSINESS",
      businessId: "business-1",
    });
    expect(claims.exp! - claims.iat!).toBe(7 * 24 * 60 * 60);
  });

  it("registers passwordless buyers and issues a buyer JWT", async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null);
    vi.mocked(repository.createBuyerUser).mockResolvedValue(
      new UserEntity("buyer-1", "buyer@example.com", "BUYER", null),
    );

    const result = await service.registerBuyer("buyer@example.com");

    expect(repository.createBuyerUser).toHaveBeenCalledWith({
      email: "buyer@example.com",
      passwordHash: null,
    });
    expect(verifyToken(result.token)).toMatchObject({
      userId: "buyer-1",
      role: "BUYER",
    });
  });

  it("logs in with the correct password and rejects an incorrect password", async () => {
    const passwordHash = await bcrypt.hash("correct-pass", 4);
    vi.mocked(repository.findByEmail).mockResolvedValue(
      new UserEntity("buyer-2", "buyer@example.com", "BUYER", passwordHash),
    );

    const result = await service.login("buyer@example.com", "correct-pass");
    expect(verifyToken(result.token)).toMatchObject({
      userId: "buyer-2",
      role: "BUYER",
    });
    await expect(
      service.login("buyer@example.com", "wrong-pass"),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("validates bearer JWTs in the auth middleware", async () => {
    const token = jwt.sign({ userId: "buyer-3", role: "BUYER" }, secret, {
      expiresIn: "7d",
    });
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as Request;
    const next = vi.fn();

    requireAuth(req, {} as Response, next);

    expect(req.auth).toMatchObject({ userId: "buyer-3", role: "BUYER" });
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects missing, invalid, and expired bearer JWTs", () => {
    const next = vi.fn();
    const missing = { headers: {} } as unknown as Request;
    const invalid = {
      headers: { authorization: "Bearer invalid-token" },
    } as unknown as Request;
    const expiredToken = jwt.sign(
      { userId: "buyer-4", role: "BUYER" },
      secret,
      { expiresIn: -1 },
    );
    const expired = {
      headers: { authorization: `Bearer ${expiredToken}` },
    } as unknown as Request;

    expect(() => requireAuth(missing, {} as Response, next)).toThrow(
      UnauthorizedError,
    );
    expect(() => requireAuth(invalid, {} as Response, next)).toThrow(
      UnauthorizedError,
    );
    expect(() => requireAuth(expired, {} as Response, next)).toThrow(
      UnauthorizedError,
    );
    expect(next).not.toHaveBeenCalled();
  });
});
