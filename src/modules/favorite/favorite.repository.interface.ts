import { FavoriteEntity } from "./favorite.entity";

export interface IFavoriteRepository {
  addFavorite(userId: string, propertyId: string): Promise<FavoriteEntity>;
  removeFavorite(userId: string, propertyId: string): Promise<void>;
  listByUser(userId: string): Promise<FavoriteEntity[]>;
}