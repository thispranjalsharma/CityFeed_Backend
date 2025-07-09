import { Document } from 'mongoose';

export interface IEventOrganizer extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEventManager extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEventStaff extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
} 