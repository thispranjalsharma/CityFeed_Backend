import { Model, Document, FilterQuery, UpdateQuery, Types } from 'mongoose';

export interface BaseDocument extends Document {
  _id: Types.ObjectId;
  isDeleted?: boolean;
  deletedAt?: Date;
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
      const byObjectId = await this.model.findOne({ 
        _id: new Types.ObjectId(id),
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
      });
      if (byObjectId) return byObjectId;
    }
    // Fallback: try as string (in case _id is stored as string)
    return this.model.findOne({ 
      _id: id,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    // Add soft delete filter to exclude deleted records
    const softDeleteFilter = {
      ...filter,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    };
    return this.model.findOne(softDeleteFilter);
  }

  async find(filter: FilterQuery<T>): Promise<T[]> {
    // Add soft delete filter to exclude deleted records
    const softDeleteFilter = {
      ...filter,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    };
    return this.model.find(softDeleteFilter);
  }

  async findSorted(filter: FilterQuery<T>, sort: { [key: string]: 1 | -1 }): Promise<T[]> {
    // Add soft delete filter to exclude deleted records
    const softDeleteFilter = {
      ...filter,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    };
    return this.model.find(softDeleteFilter).sort(sort).exec();
  }

  async update(id: string, data: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true });
  }

  // Soft delete method
  async softDelete(id: string): Promise<T | null> {
    return this.model.findByIdAndUpdate(
      id, 
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      }, 
      { new: true }
    );
  }

  // Hard delete method (use with caution)
  async hardDelete(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id);
  }

  // Find including deleted records (for admin purposes)
  async findIncludingDeleted(filter: FilterQuery<T>): Promise<T[]> {
    return this.model.find(filter);
  }

  // Find only deleted records
  async findDeleted(filter: FilterQuery<T> = {}): Promise<T[]> {
    return this.model.find({
      ...filter,
      isDeleted: true
    });
  }

  // Restore deleted record
  async restore(id: string): Promise<T | null> {
    return this.model.findByIdAndUpdate(
      id,
      { 
        isDeleted: false, 
        deletedAt: undefined 
      },
      { new: true }
    );
  }

  async delete(id: string): Promise<T | null> {
    // Default to soft delete for safety
    return this.softDelete(id);
  }

  async deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount?: number }> {
    // Hard delete multiple documents - use with caution
    return this.model.deleteMany(filter);
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    // Add soft delete filter to exclude deleted records
    const softDeleteFilter = {
      ...filter,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    };
    const count = await this.model.countDocuments(softDeleteFilter);
    return count > 0;
  }
} 