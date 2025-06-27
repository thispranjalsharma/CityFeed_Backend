import { Model, Document, FilterQuery, UpdateQuery, Types } from 'mongoose';

export interface BaseDocument extends Document {
  _id: Types.ObjectId;
}

export abstract class BaseRepository<T extends BaseDocument> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<T | null> {
    // Try as ObjectId if valid, else fallback to string
    if (Types.ObjectId.isValid(id)) {
      const byObjectId = await this.model.findOne({ _id: new Types.ObjectId(id) });
      if (byObjectId) return byObjectId;
    }
    // Fallback: try as string (in case _id is stored as string)
    return this.model.findOne({ _id: id });
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter);
  }

  async find(filter: FilterQuery<T>): Promise<T[]> {
    return this.model.find(filter);
  }

  async findSorted(filter: FilterQuery<T>, sort: { [key: string]: 1 | -1 }): Promise<T[]> {
    return this.model.find(filter).sort(sort).exec();
  }

  async update(id: string, data: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id);
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }
} 