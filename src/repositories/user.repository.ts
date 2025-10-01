import { inject, injectable } from "inversify";
import { IUser, IUserDocument, User } from "../models/user.model";
import { FilterQuery } from "mongoose";
import { UpdateQuery } from "mongoose";

export interface IUserRepository {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findByPhone(phone: string): Promise<IUserDocument | null>;
  create(
    data: Omit<IUser, "_id" | "createdAt" | "updatedAt">
  ): Promise<IUserDocument>;
  verifyEmail(id: string): Promise<IUserDocument | null>;
  verifyPhone(id: string): Promise<IUserDocument | null>;
  updatePassword(
    id: string,
    hashedPassword: string
  ): Promise<IUserDocument | null>;
  activateUser(id: string): Promise<IUserDocument | null>;
  deactivateUser(id: string): Promise<IUserDocument | null>;
  findByPhoneOrEmail(phoneOrEmail: string): Promise<IUserDocument | null>;
  findById(id: string): Promise<IUserDocument | null>;
  verifyPassword(id: string, password: string): Promise<IUserDocument | null>;
  changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IUserDocument | null>;
  deleteUser(id: string): Promise<IUserDocument | null>;
  findByQrCode(qrCodeUrl: string): Promise<IUserDocument | null>;
  updateUserProfile(id: string, data: Partial<IUser>);
  updateDeductCoins(
    userId: string,
    update: { $inc: { coins: number } }
  ): Promise<IUserDocument>;
  // deleteMany(email:string): Promise<number>;
  findVerified(email: string): Promise<IUserDocument | null>;
  deleteMany(filter: Record<string, any>): Promise<number>;
  findPhone(phone: string): Promise<IUserDocument | null>;
  delete(id: string): Promise<IUserDocument | null>;
  getWalletBalance(userId: string): Promise<number>;

  // ---------------------------------------------------------------------
  findOne(filter: FilterQuery<IUser>): Promise<IUser | null>;
  updateUser(id: string, data: Partial<IUser>): Promise<IUserDocument | null>;
  update(id: string, updates: Partial<IUser>): Promise<IUserDocument | null>;
  findAll(): Promise<IUserDocument[]>;
  findByReferralCode(referralCode: string): Promise<IUserDocument | null>;
}

@injectable()
export class UserRepository implements IUserRepository {
  constructor(@inject("UserModel") private userModel: typeof User) {}

  async update(
    id: string,
    data: UpdateQuery<IUser>
  ): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, data, { new: true });
  }

  findAll(): Promise<IUserDocument[]> {
    return this.userModel.find({ isDeleted: { $ne: true } });
  }

  // -------------------------------------------------------------------------

  async findOne(filter: FilterQuery<IUser>): Promise<IUser | null> {
    const softDeleteFilter = {
      ...filter,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    };
    return this.userModel.findOne(softDeleteFilter);
  }

  async getWalletBalance(userId: string): Promise<number> {
    return this.userModel
      .findById(userId)
      .then((user) => (user ? user.coins : 0));
  }

  updateUser(id: string, data: Partial<IUser>): Promise<IUserDocument | null> {
    return this.userModel.findOneAndUpdate({ _id: id }, data, { new: true });
  }

  delete(id: string): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndDelete(id);
  }
  findPhone(phone: string): Promise<IUserDocument | null> {
    return this.userModel.findOne({ phone });
  }

  findVerified(email: string): Promise<IUserDocument | null> {
    return this.userModel.findOne({ email, verified: true });
  }

  async deleteMany(filter: Record<string, any>): Promise<number> {
    const res = await this.userModel.deleteMany(filter);
    return res.deletedCount || 0;
  }
  async updateDeductCoins(
    userId: string,
    update: { $inc: { coins: number } }
  ): Promise<IUserDocument> {
    return this.userModel.findByIdAndUpdate(userId, update, { new: true });
  }

  updateUserProfile(id: string, data: Partial<IUser>) {
    return this.userModel.findOneAndUpdate({ _id: id }, data, { new: true });
  }

  async findByQrCode(qrCodeUrl: string): Promise<IUserDocument | null> {
    return this.userModel.findOne({ qrCodeUrl });
  }

  deleteUser(id: string): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndDelete(id);
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IUserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: id, password: currentPassword }, // filter
      { password: newPassword }, // update
      { new: true } // options
    );
  }

  async verifyPassword(
    id: string,
    password: string
  ): Promise<IUserDocument | null> {
    return this.userModel.findOne({ _id: id, password });
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return this.userModel.findById(id);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    const user = await this.userModel.findOne({ email });
    return user;
  }

  async findByPhone(phone: string): Promise<IUserDocument | null> {
    return this.userModel.findOne({ phone });
  }

  async create(
    data: Omit<IUser, "_id" | "createdAt" | "updatedAt">
  ): Promise<IUserDocument> {
    return this.userModel.create(data);
  }

  async verifyEmail(id: string): Promise<IUserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: id }, // filter
      { isEmailVerified: true }, // update
      { new: true } // options
    );
  }
  async verifyPhone(id: string): Promise<IUserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: id }, // filter
      { isPhoneVerified: true }, // update
      { new: true } // options
    );
  }

  async updatePassword(
    id: string,
    hashedPassword: string
  ): Promise<IUserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: id }, // filter
      { password: hashedPassword }, // update
      { new: true } // options
    );
  }

  async activateUser(id: string): Promise<IUserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: { $eq: id } }, // filter
      { new: true } // options
    );
  }

  async deactivateUser(id: string): Promise<IUserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: id }, // filter
      { isActive: false }, // update
      { new: true } // options
    );
  }

  async findByPhoneOrEmail(
    phoneOrEmail: string
  ): Promise<IUserDocument | null> {
    // Check if the input looks like an email (contains @ symbol)
    const isEmail = phoneOrEmail.includes("@");

    const baseQuery = {
      isActive: true,
      isEmailVerified: true,
      $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
    };

    if (isEmail) {
      return this.userModel.findOne({ ...baseQuery, email: phoneOrEmail });
    } else {
      return this.userModel.findOne({ ...baseQuery, phone: phoneOrEmail });
    }
  }

  async addCoins(
    userId: string,
    amount: number
  ): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, {
      $inc: { coins: amount },
    });
  }

  async deductCoins(
    userId: string,
    amount: number
  ): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, {
      $inc: { coins: -amount },
    });
  }

  async updateMembership(
    userId: string,
    membershipType: string,
    expiryDate: Date
  ): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, {
      membershipType,
      membershipExpiryDate: expiryDate,
    });
  }

  async findByReferralCode(
    referralCode: string
  ): Promise<IUserDocument | null> {
    return this.userModel.findOne({ referralCode });
  }

  async updateQrCode(
    userId: string,
    qrCodeUrl: string
  ): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { qrCodeUrl });
  }
}
