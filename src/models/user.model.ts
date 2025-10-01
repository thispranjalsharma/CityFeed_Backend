import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";

// Interfaces

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  dob: Date;
  gender: "male" | "female" | "other";
  phone: string;
  membershipType: "cityfeed_select" | "cityfeed_edge" | "cityfeed_prime";
  membershipExpiryDate: Date;
  role: "user" | "admin" | "guest_event";
  coins: number;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isApproved: boolean;
  isDeleted?: boolean;
  deletedAt?: Date;
  profilePicture?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  preferences?: {
    notifications: boolean;
    language: string;
    theme: string;
  };
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  isGuest?: boolean;
  referralCode?: string;
  referredBy?: string | null;
  qrCodeUrl?: string;
}

export interface IUserDocument extends Omit<IUser, "_id">, Document {
  _id: Types.ObjectId;
  referralCode?: string;
  referredBy?: string | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserResponse extends Omit<IUser, "password"> {
  fullName: string;
}

// Schema

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: false },
    password: { type: String, required: false },
    dob: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    phone: { type: String, required: true, unique: true },
    membershipType: {
      type: String,
      enum: ["cityfeed_select", "cityfeed_edge", "cityfeed_prime"],
      required: false,
    },
    membershipExpiryDate: { type: Date, required: false },
    role: {
      type: String,
      enum: ["user", "admin", "guest_event"],
      default: "user",
    },
    coins: {
      type: Number,
      default: 0,
      get: (v: number) => Math.round(v),
      set: (v: number) => Math.round(v),
    },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isGuest: { type: Boolean, default: false },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: String, default: null },
    profilePicture: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },
    preferences: {
      notifications: { type: Boolean, default: true },
      language: { type: String, default: "en" },
      theme: { type: String, default: "light" },
    },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    isApproved: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    qrCodeUrl: { type: String },
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Compound unique index: email can only be unique if it's verified
userSchema.index(
  { email: 1, isEmailVerified: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      email: { $exists: true, $nin: [null, ""] },
      isEmailVerified: true,
    },
  }
);

userSchema.index({ isDeleted: 1 });
userSchema.index({ deletedAt: 1 });

export const User = mongoose.model<IUserDocument>("User", userSchema);
