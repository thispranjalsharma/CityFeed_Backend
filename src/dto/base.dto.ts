/**
 * Base DTO interfaces and common types used across the application
 */

export interface BaseResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends BaseResponse {
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface AddressDTO {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface PreferencesDTO {
  notifications: boolean;
  language: string;
  theme: string;
}

export interface LocationDTO {
  type: 'Point';
  coordinates: [number, number];
}

export interface BaseEntityDTO {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteDTO {
  isDeleted?: boolean;
  deletedAt?: Date;
}
