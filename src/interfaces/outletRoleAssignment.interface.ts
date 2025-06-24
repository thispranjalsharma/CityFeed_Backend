import { Document, Types } from 'mongoose';

export interface IOutletRoleAssignment extends Document {
  outlet: Types.ObjectId;
  role: string;
  responsibilities: string[];
  email: string;
  password: string;
  phone: string;
  name?: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Suggested responsibilities for employees:
// 'create_offer', 'update_offer', 'delete_offer', 'view_offer',
// 'create_order', 'update_order', 'delete_order', 'view_order',
// 'view_feedback', 'respond_feedback',
// 'initiate_payment', 'refund_payment', 'view_payment',
// 'view_outlet', 'update_outlet', 'manage_employees',
// 'create_dinein_session', 'close_dinein_session', 'view_dinein_session',
// 'assign_roles', 'view_dashboard', 'manage_inventory', 'manage_menu' 