import { BaseEntityDTO, BaseResponse } from './base.dto';

/**
 * Admin-related DTOs for administrative user management
 */

export interface AdminCreateDTO {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'outlet_admin';
  phone?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface AdminUpdateDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'outlet_admin';
  phone?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface AdminResponseDTO extends BaseEntityDTO {
  name: string;
  email: string;
  role: 'admin' | 'outlet_admin';
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
}

export interface AdminSearchDTO {
  name?: string;
  email?: string;
  role?: 'admin' | 'outlet_admin';
  isActive?: boolean;
  isEmailVerified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminStatsDTO {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  verifiedAdmins: number;
  unverifiedAdmins: number;
  roleBreakdown: {
    admin: number;
    outlet_admin: number;
  };
  recentAdmins: AdminResponseDTO[];
}

export interface AdminStatsResponseDTO extends BaseResponse {
  data: AdminStatsDTO;
}

export interface AdminActivationDTO {
  adminId: string;
  isActive: boolean;
}

export interface AdminActivationResponseDTO extends BaseResponse {
  data: {
    adminId: string;
    isActive: boolean;
    updatedAt: Date;
  };
}

export interface AdminVerificationDTO {
  adminId: string;
  isEmailVerified: boolean;
}

export interface AdminVerificationResponseDTO extends BaseResponse {
  data: {
    adminId: string;
    isEmailVerified: boolean;
    updatedAt: Date;
  };
}

export interface AdminPasswordResetDTO {
  adminId: string;
  newPassword: string;
}

export interface AdminPasswordResetResponseDTO extends BaseResponse {
  data: {
    adminId: string;
    message: string;
    updatedAt: Date;
  };
}

export interface AdminBulkUpdateDTO {
  adminIds: string[];
  updates: Partial<AdminUpdateDTO>;
}

export interface AdminBulkUpdateResponseDTO extends BaseResponse {
  data: {
    updatedCount: number;
    message: string;
    updatedAt: Date;
  };
}

export interface AdminBulkDeleteDTO {
  adminIds: string[];
  reason?: string;
}

export interface AdminBulkDeleteResponseDTO extends BaseResponse {
  data: {
    deletedCount: number;
    message: string;
    deletedAt: Date;
  };
}

export interface AdminExportDTO {
  role?: 'admin' | 'outlet_admin';
  isActive?: boolean;
  isEmailVerified?: boolean;
  format: 'csv' | 'excel' | 'json';
}

export interface AdminExportResponseDTO extends BaseResponse {
  data: {
    downloadUrl: string;
    fileName: string;
    format: string;
    recordCount: number;
  };
}

export interface AdminRoleChangeDTO {
  adminId: string;
  newRole: 'admin' | 'outlet_admin';
}

export interface AdminRoleChangeResponseDTO extends BaseResponse {
  data: {
    adminId: string;
    oldRole: 'admin' | 'outlet_admin';
    newRole: 'admin' | 'outlet_admin';
    updatedAt: Date;
  };
}

export interface AdminPermissionsDTO {
  adminId: string;
  permissions: string[];
}

export interface AdminPermissionsResponseDTO extends BaseResponse {
  data: {
    adminId: string;
    permissions: string[];
    updatedAt: Date;
  };
}
