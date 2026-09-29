import { v2 as cloudinary } from "cloudinary";
import { AppError } from "@common/errors/AppError";
import {
  IPropertyImageStorage,
  StoredPropertyImage,
} from "./image-storage.interface";

export class CloudinaryPropertyImageStorage implements IPropertyImageStorage {
  private readonly configured: boolean;

  constructor(cloudName: string, apiKey: string, apiSecret: string) {
    this.configured = Boolean(cloudName && apiKey && apiSecret);
    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  async upload(
    buffer: Buffer,
    businessId: string,
  ): Promise<StoredPropertyImage> {
    if (!this.configured)
      throw new AppError(503, "Image storage is not configured");

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `property-listings/${businessId}`,
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Image upload failed"));
            return;
          }
          resolve({ publicId: result.public_id, url: result.secure_url });
        },
      );
      stream.end(buffer);
    });
  }
}
