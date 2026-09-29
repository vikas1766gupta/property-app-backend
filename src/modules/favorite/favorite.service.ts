import { IFavoriteRepository } from "./favorite.repository.interface";
import { FavoriteEntity } from "./favorite.entity";

export interface FavoriteState {
  propertyId: string;
  isFavorited: boolean;
}

export class FavoriteService {
  constructor(private readonly favoriteRepo: IFavoriteRepository) {}

  addFavorite(userId: string, propertyId: string): Promise<FavoriteEntity> {
    return this.favoriteRepo.addFavorite(userId, propertyId);
  }

  async removeFavorite(
    userId: string,
    propertyId: string,
  ): Promise<FavoriteState> {
    await this.favoriteRepo.removeFavorite(userId, propertyId);
    return { propertyId, isFavorited: false };
  }

  listByUser(userId: string): Promise<FavoriteEntity[]> {
    return this.favoriteRepo.listByUser(userId);
  }
}
