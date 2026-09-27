import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { BadRequestError } from "@common/errors/AppError";
import { ALLOWED_PROPERTY_IMAGE_TYPES, MAX_PROPERTY_IMAGE_SIZE } from "./property-image-upload.validation";

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROPERTY_IMAGE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_PROPERTY_IMAGE_TYPES.includes(file.mimetype as (typeof ALLOWED_PROPERTY_IMAGE_TYPES)[number])) {
      callback(new BadRequestError("Only JPEG, PNG, and WebP images are allowed"));
      return;
    }
    callback(null, true);
  },
}).single("image");

export function propertyImageUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  uploadImage(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new BadRequestError("Image must be no larger than 8 MB"));
      return;
    }
    if (error instanceof multer.MulterError) {
      next(new BadRequestError("Invalid image upload"));
      return;
    }
    next(error);
  });
}