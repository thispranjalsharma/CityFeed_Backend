import { BaseEntityDTO, BaseResponse, LocationDTO, SoftDeleteDTO } from './base.dto';

/**
 * Outlet-related DTOs for business management
 */

export interface OutletCreateDTO {
  businessName: string;
  businessType: string;
  businessDescription: string;
  category: string;
  address: string;
  location?: LocationDTO;
  images?: string[];
  defaultMaxDiscount: number;
  createdBy: string;
  assignedAdmin?: string;
  isActive?: boolean;
}

export interface OutletUpdateDTO {
  businessName?: string;
  businessType?: string;
  businessDescription?: string;
  category?: string;
  address?: string;
  location?: LocationDTO;
  images?: string[];
  defaultMaxDiscount?: number;
  assignedAdmin?: string;
  isActive?: boolean;
}

export interface OutletResponseDTO extends BaseEntityDTO, SoftDeleteDTO {
  businessName: string;
  businessType: string;
  businessDescription: string;
  category: string;
  address: string;
  location?: LocationDTO;
  images: string[];
  defaultMaxDiscount: number;
  createdBy: string;
  assignedAdmin?: string;
  isActive: boolean;
  adminDetails?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  stats?: {
    totalOffers: number;
    activeOffers: number;
    totalReviews: number;
    averageRating: number;
    totalOrders: number;
    totalRevenue: number;
  };
}

export interface OutletSearchDTO {
  businessName?: string;
  businessType?: string;
  category?: string;
  isActive?: boolean;
  assignedAdmin?: string;
  location?: {
    lat: number;
    lng: number;
    radius: number; // in kilometers
  };
  minDiscount?: number;
  maxDiscount?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OutletStatsDTO {
  totalOutlets: number;
  activeOutlets: number;
  inactiveOutlets: number;
  totalCategories: number;
  totalAdmins: number;
  averageDiscount: number;
  recentOutlets: OutletResponseDTO[];
  categoryBreakdown: {
    category: string;
    count: number;
  }[];
}

export interface OutletStatsResponseDTO extends BaseResponse {
  data: OutletStatsDTO;
}

export interface OutletActivationDTO {
  outletId: string;
  isActive: boolean;
}

export interface OutletActivationResponseDTO extends BaseResponse {
  data: {
    outletId: string;
    isActive: boolean;
    updatedAt: Date;
  };
}

export interface OutletAssignmentDTO {
  outletId: string;
  adminId: string;
}

export interface OutletAssignmentResponseDTO extends BaseResponse {
  data: {
    outletId: string;
    adminId: string;
    assignedAt: Date;
  };
}

export interface OutletUnassignmentDTO {
  outletId: string;
}

export interface OutletUnassignmentResponseDTO extends BaseResponse {
  data: {
    outletId: string;
    unassignedAt: Date;
  };
}

export interface OutletBulkUpdateDTO {
  outletIds: string[];
  updates: Partial<OutletUpdateDTO>;
}

export interface OutletBulkUpdateResponseDTO extends BaseResponse {
  data: {
    updatedCount: number;
    message: string;
    updatedAt: Date;
  };
}

export interface OutletBulkDeleteDTO {
  outletIds: string[];
  reason?: string;
}

export interface OutletBulkDeleteResponseDTO extends BaseResponse {
  data: {
    deletedCount: number;
    message: string;
    deletedAt: Date;
  };
}

export interface OutletExportDTO {
  category?: string;
  isActive?: boolean;
  assignedAdmin?: string;
  format: 'csv' | 'excel' | 'json';
  includeStats?: boolean;
}

export interface OutletExportResponseDTO extends BaseResponse {
  data: {
    downloadUrl: string;
    fileName: string;
    format: string;
    recordCount: number;
  };
}

export interface OutletDuplicateDTO {
  outletId: string;
  newBusinessName: string;
  newAddress: string;
  newLocation?: LocationDTO;
}

export interface OutletDuplicateResponseDTO extends BaseResponse {
  data: {
    originalOutlet: OutletResponseDTO;
    duplicatedOutlet: OutletResponseDTO;
  };
}

export interface OutletImageUploadDTO {
  outletId: string;
  images: string[];
}

export interface OutletImageUploadResponseDTO extends BaseResponse {
  data: {
    outletId: string;
    images: string[];
    uploadedAt: Date;
  };
}

export interface OutletImageDeleteDTO {
  outletId: string;
  imageUrl: string;
}

export interface OutletImageDeleteResponseDTO extends BaseResponse {
  data: {
    outletId: string;
    deletedImageUrl: string;
    deletedAt: Date;
  };
}
