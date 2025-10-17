import { FilterQuery, Model, QueryOptions } from 'mongoose';

import { BaseEntity } from '../entity';
import { ListResponse } from '../types/list-response.type';
import { BaseRepositoryInterface } from './base.interface.repository';

export abstract class BaseRepositoryAbstract<T extends BaseEntity>
  implements BaseRepositoryInterface<T>
{
  protected constructor(private readonly model: Model<T>) {
    this.model = model;
  }

  async create(dto: T): Promise<T> {
    const created = await this.model.create(dto);
    return created.save();
  }

  async findOneById(
    id: string,
    projection?: string,
    options?: QueryOptions<T>,
  ): Promise<T | null> {
    const item = await this.model
      .findById(id, projection ? `${projection} deletedAt` : undefined, options)
      .exec();
    return item?.deletedAt ? null : item;
  }

  async findOneByCondition(
    condition = {},
    projection?: string,
    options?: QueryOptions<T>,
  ): Promise<T | null> {
    return this.model
      .findOne(
        {
          ...condition,
          deletedAt: null,
        },
        projection,
        options,
      )
      .exec();
  }

  async findMany(
    condition: FilterQuery<T>,
    options?: QueryOptions<T>,
  ): Promise<ListResponse<T>> {
    const [count, items] = await Promise.all([
      this.model.countDocuments({ ...condition, deletedAt: null }).exec(),
      this.model
        .find({ ...condition, deletedAt: null }, options?.projection, options)
        .exec(),
    ]);
    return {
      count,
      items,
    };
  }

  async update(id: string, dto: Partial<T>): Promise<T | null> {
    return await this.model
      .findOneAndUpdate({ _id: id, deletedAt: null }, dto, { new: true })
      .exec();
  }

  async softDelete(id: string): Promise<boolean> {
    const found = await this.model.findById(id);
    if (!found) {
      return false;
    }

    return !!(await this.model
      .findByIdAndUpdate<T>(id, {
        deletedAt: new Date(),
      })
      .exec());
  }

  async hardDelete(id: string): Promise<boolean> {
    const found = await this.model.findById(id).exec();
    if (!found) {
      return false;
    }
    return !!(await this.model.findByIdAndDelete(id).exec());
  }
}
