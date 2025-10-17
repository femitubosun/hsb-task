import { ListResponse } from '../types/list-response.type';

export interface BaseRepositoryInterface<T> {
  create(dto: Partial<T>): Promise<T>;

  findOneById(
    id: string,
    projection?: string,
    option?: object,
  ): Promise<T | null>;

  findOneByCondition(
    condition?: object,
    projection?: string,
    options?: object,
  ): Promise<T | null>;

  findMany(condition: object, options?: object): Promise<ListResponse<T>>;

  update(id: string, dto: Partial<T>): Promise<T | null>;

  softDelete(id: string): Promise<boolean>;

  hardDelete(id: string): Promise<boolean>;
}
