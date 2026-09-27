export interface StoredPropertyImage {
  publicId: string;
  url: string;
}

export interface IPropertyImageStorage {
  upload(buffer: Buffer, businessId: string): Promise<StoredPropertyImage>;
}