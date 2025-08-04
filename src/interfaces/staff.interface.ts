import { Document, Types } from 'mongoose';

export interface IStaff extends Document {
  outlet: Types.ObjectId;
  role: string;
  responsibilities: string[];
  email: string;
  password: string;
  phone: string;
  name?: string;
  isEmailVerified: boolean;
  isFirstLogin: boolean;
  isDeleted?: boolean; // Soft delete flag
  deletedAt?: Date; // Soft delete timestamp
  createdAt: Date;
  updatedAt: Date;
}

// Available responsibilities for employees (flexible assignment):
// 'create_offer', 'update_offer', 'delete_offer', 'view_offer',
// 'create_order', 'update_order', 'delete_order', 'view_order',
// 'view_feedback', 'respond_feedback',
// 'initiate_payment', 'refund_payment', 'view_payment',
// 'view_outlet', 'update_outlet', 'manage_employees',
// 'create_dinein_session', 'close_dinein_session', 'view_dinein_session',
// 'assign_roles', 'view_dashboard', 'manage_inventory', 'manage_menu',
// 'view_reports', 'generate_reports', 'manage_customers',
// 'manage_reservations', 'view_analytics', 'manage_promotions',
// 'handle_complaints', 'manage_suppliers', 'view_financial_data' 