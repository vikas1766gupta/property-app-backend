import { PropertyEntity } from "@modules/property/property.entity";

export class FavoriteEntity {
  constructor(
    public id: string,
    public userId: string,
    public propertyId: string,
    public createdAt: Date,
    public property: PropertyEntity
  ) {}
}