import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

// Interface Started

export interface IEventOrganizer {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  isEmailVerified: boolean;
  isFirstLogin: boolean;
  isApproved: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
// Interface Ended

export interface IEventOrganizer extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  isEmailVerified: boolean;
  isFirstLogin: boolean;
  isApproved: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventOrganizerSchema = new Schema<IEventOrganizer>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    isEmailVerified: { type: Boolean, default: false },
    isFirstLogin: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventOrganizerSchema.pre<IEventOrganizer>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const EventOrganizer = mongoose.model<IEventOrganizer>(
  "EventOrganizer",
  eventOrganizerSchema
);
