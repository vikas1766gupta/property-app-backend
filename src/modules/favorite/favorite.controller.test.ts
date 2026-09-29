import { AddressInfo } from "node:net";
import express, { Express } from "express";
import jwt from "jsonwebtoken";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { errorHandlerMiddleware } from "@common/middleware/errorHandler.middleware";
import { PropertyEntity } from "@modules/property/property.entity";
import { FavoriteController } from "./favorite.controller";
import { FavoriteEntity } from "./favorite.entity";
import { favoriteRoutes } from "./favorite.routes";
import { FavoriteService } from "./favorite.service";

const secret = "favorite-test-secret";
const propertyId = "property-1";
const buyerId = "buyer-1";
const property = {
  id: propertyId,
  title: "Saved test property",
} as PropertyEntity;
const favoriteByKey = new Map<string, FavoriteEntity>();
let app: Express;
let server: ReturnType<Express["listen"]>;
let baseUrl: string;
let buyerToken: string;
const originalSecret = process.env.JWT_SECRET;

const favoriteService = new FavoriteService({
  async addFavorite(userId, id) {
    const key = `${userId}:${id}`;
    let favorite = favoriteByKey.get(key);
    if (!favorite) {
      favorite = new FavoriteEntity(
        `favorite-${favoriteByKey.size + 1}`,
        userId,
        id,
        new Date(),
        property,
      );
      favoriteByKey.set(key, favorite);
    }
    return favorite;
  },
  async removeFavorite(userId, id) {
    favoriteByKey.delete(`${userId}:${id}`);
  },
  async listByUser(userId) {
    return [...favoriteByKey.values()].filter(
      (favorite) => favorite.userId === userId,
    );
  },
});

beforeAll(async () => {
  process.env.JWT_SECRET = secret;
  buyerToken = jwt.sign({ userId: buyerId, role: "BUYER" }, secret);
  app = express();
  app.use(
    "/api/favorites",
    favoriteRoutes(new FavoriteController(favoriteService)),
  );
  app.use(errorHandlerMiddleware);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/favorites`;
});

beforeEach(() => favoriteByKey.clear());

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

async function request(
  path: string,
  method = "GET",
  token = buyerToken,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("favorite endpoints", () => {
  it("adds a favorite idempotently when the property is already favorited", async () => {
    const first = await request(`/${propertyId}`, "PUT");
    const repeated = await request(`/${propertyId}`, "PUT");
    const firstBody = (await first.json()) as {
      id: string;
      isFavorited: boolean;
    };
    const repeatedBody = (await repeated.json()) as {
      id: string;
      isFavorited: boolean;
    };

    expect(first.status).toBe(200);
    expect(firstBody.isFavorited).toBe(true);
    expect(repeated.status).toBe(200);
    expect(repeatedBody.id).toBe(firstBody.id);
    expect(favoriteByKey.size).toBe(1);
  });

  it("lists the authenticated buyer's favorites", async () => {
    await request(`/${propertyId}`, "PUT");
    const response = await request("/");
    const body = (await response.json()) as Array<{ propertyId: string }>;

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].propertyId).toBe(propertyId);
  });

  it("removes a favorite and treats a missing favorite as already removed", async () => {
    await request(`/${propertyId}`, "PUT");
    const first = await request(`/${propertyId}`, "DELETE");
    const repeated = await request(`/${propertyId}`, "DELETE");

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({
      propertyId,
      isFavorited: false,
    });
    expect(repeated.status).toBe(200);
    await expect(repeated.json()).resolves.toEqual({
      propertyId,
      isFavorited: false,
    });
    expect(favoriteByKey.size).toBe(0);
  });

  it("requires authentication and the buyer role", async () => {
    const anonymous = await request("/", "GET", "");
    const businessToken = jwt.sign(
      { userId: "business-user", role: "BUSINESS" },
      secret,
    );
    const business = await request("/", "GET", businessToken);

    expect(anonymous.status).toBe(401);
    expect(business.status).toBe(403);
  });
});
