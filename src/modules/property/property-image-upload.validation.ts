import { BadRequestError } from "@common/errors/AppError";

export const MAX_PROPERTY_IMAGE_SIZE = 8 * 1024 * 1024;
export const ALLOWED_PROPERTY_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function validatePropertyImage(mimetype: string, size: number): void {
  if (
    !ALLOWED_PROPERTY_IMAGE_TYPES.includes(
      mimetype as (typeof ALLOWED_PROPERTY_IMAGE_TYPES)[number],
    )
  ) {
    throw new BadRequestError("Only JPEG, PNG, and WebP images are allowed");
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PROPERTY_IMAGE_SIZE) {
    throw new BadRequestError(
      "Image must be larger than 0 bytes and no larger than 8 MB",
    );
  }
}
