import { describe, expect, it } from "vitest";
import { BadRequestError } from "@common/errors/AppError";
import { MAX_PROPERTY_IMAGE_SIZE, validatePropertyImage } from "./property-image-upload.validation";

describe("property image upload validation", () => {
  it("accepts a supported image within the size limit", () => {
    expect(() => validatePropertyImage("image/webp", MAX_PROPERTY_IMAGE_SIZE)).not.toThrow();
  });

  it("rejects unsupported file types", () => {
    expect(() => validatePropertyImage("image/svg+xml", 100)).toThrow(BadRequestError);
  });

  it("rejects images larger than the upload limit", () => {
    expect(() => validatePropertyImage("image/jpeg", MAX_PROPERTY_IMAGE_SIZE + 1)).toThrow(BadRequestError);
  });
});