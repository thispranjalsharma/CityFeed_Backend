import { Request } from "express";

export interface AuthUser {
  _id: string;
  email: string;
  role:
    | "user"
    | "admin"
    | "super_admin"
    | "employee"
    | "outlet_admin"
    | "event_organizer"
    | "event_manager"
    | "event_staff"
    | "guest_event";
  type:
    | "user"
    | "admin"
    | "super_admin"
    | "employee"
    | "outlet_admin"
    | "event_organizer"
    | "event_manager"
    | "event_staff"
    | "guest_event";
}

export interface TokenPayload extends AuthUser {
  iat?: number;
  exp?: number;
  role:
    | "user"
    | "admin"
    | "super_admin"
    | "employee"
    | "outlet_admin"
    | "event_organizer"
    | "event_manager"
    | "event_staff"
    | "guest_event";
  type:
    | "user"
    | "admin"
    | "super_admin"
    | "employee"
    | "outlet_admin"
    | "event_organizer"
    | "event_manager"
    | "event_staff"
    | "guest_event";
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
  files?: { [fieldname: string]: any[] } | any[];
  file?: any;
  userId?: string;
  outletId?: string;
  adminId?: string;
  ip?: string;
}
