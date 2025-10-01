import { BaseEntityDTO, BaseResponse } from './base.dto';

/**
 * Review-related DTOs for feedback and rating management
 */

export interface ReviewCreateDTO {
  userId: string;
  outletId: string;
  dineInSessionId: string;
  rating: number;
  comment: string;
}

export interface ReviewUpdateDTO {
  rating?: number;
  comment?: string;
}

export interface ReviewResponseDTO extends BaseEntityDTO {
  userId: string;
  outletId: string;
  dineInSessionId: string;
  rating: number;
  comment: string;
  user: {
    _id: string;
    name: string;
  };
  outlet: {
    _id: string;
    businessName: string;
  };
}

export interface ReviewSearchDTO {
  userId?: string;
  outletId?: string;
  dineInSessionId?: string;
  minRating?: number;
  maxRating?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReviewStatsDTO {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentReviews: ReviewResponseDTO[];
}

export interface ReviewStatsResponseDTO extends BaseResponse {
  data: ReviewStatsDTO;
}

export interface OutletReviewStatsDTO {
  outletId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentReviews: ReviewResponseDTO[];
  outlet: {
    _id: string;
    businessName: string;
    businessType: string;
    category: string;
  };
}

export interface OutletReviewStatsResponseDTO extends BaseResponse {
  data: OutletReviewStatsDTO;
}

export interface UserReviewStatsDTO {
  userId: string;
  totalReviews: number;
  averageRating: number;
  recentReviews: ReviewResponseDTO[];
  user: {
    _id: string;
    name: string;
  };
}

export interface UserReviewStatsResponseDTO extends BaseResponse {
  data: UserReviewStatsDTO;
}

export interface ReviewDeleteDTO {
  reviewId: string;
  reason?: string;
}

export interface ReviewDeleteResponseDTO extends BaseResponse {
  data: {
    message: string;
    deletedAt: Date;
  };
}

export interface ReviewBulkDeleteDTO {
  reviewIds: string[];
  reason?: string;
}

export interface ReviewBulkDeleteResponseDTO extends BaseResponse {
  data: {
    deletedCount: number;
    message: string;
    deletedAt: Date;
  };
}

export interface ReviewExportDTO {
  outletId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  format: 'csv' | 'excel' | 'json';
}

export interface ReviewExportResponseDTO extends BaseResponse {
  data: {
    downloadUrl: string;
    fileName: string;
    format: string;
    recordCount: number;
  };
}
