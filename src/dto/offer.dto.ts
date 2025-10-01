import { BaseEntityDTO, BaseResponse, SoftDeleteDTO } from './base.dto';

/**
 * Offer-related DTOs for discount and promotion management
 */

export interface OfferCreateDTO {
  outletId: string;
  title: string;
  description: string;
  discountPercentage: number;
  validFrom: Date;
  validTo: Date;
  isActive?: boolean;
  isDefault?: boolean;
  createdByRole?: string;
  createdByUser?: string;
}

export interface OfferUpdateDTO {
  title?: string;
  description?: string;
  discountPercentage?: number;
  validFrom?: Date;
  validTo?: Date;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface OfferResponseDTO extends BaseEntityDTO, SoftDeleteDTO {
  outletId: string;
  title: string;
  description: string;
  discountPercentage: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  isDefault: boolean;
  createdByRole?: string;
  createdByUser?: string;
  outlet?: {
    _id: string;
    businessName: string;
    businessType: string;
    category: string;
  };
}

export interface OfferSearchDTO {
  outletId?: string;
  title?: string;
  isActive?: boolean;
  isDefault?: boolean;
  createdByRole?: string;
  createdByUser?: string;
  validFrom?: Date;
  validTo?: Date;
  minDiscount?: number;
  maxDiscount?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OfferStatsDTO {
  totalOffers: number;
  activeOffers: number;
  inactiveOffers: number;
  defaultOffers: number;
  expiredOffers: number;
  averageDiscount: number;
  totalOutlets: number;
  recentOffers: OfferResponseDTO[];
}

export interface OfferStatsResponseDTO extends BaseResponse {
  data: OfferStatsDTO;
}

export interface OfferActivationDTO {
  offerId: string;
  isActive: boolean;
}

export interface OfferActivationResponseDTO extends BaseResponse {
  data: {
    offerId: string;
    isActive: boolean;
    updatedAt: Date;
  };
}

export interface OfferDefaultDTO {
  offerId: string;
  isDefault: boolean;
}

export interface OfferDefaultResponseDTO extends BaseResponse {
  data: {
    offerId: string;
    isDefault: boolean;
    updatedAt: Date;
  };
}

export interface OfferValidationDTO {
  offerId: string;
  outletId: string;
  amount: number;
}

export interface OfferValidationResponseDTO extends BaseResponse {
  data: {
    isValid: boolean;
    discountAmount: number;
    finalAmount: number;
    offer: OfferResponseDTO;
  };
}

export interface OfferBulkCreateDTO {
  offers: Omit<OfferCreateDTO, 'outletId'>[];
  outletIds: string[];
}

export interface OfferBulkCreateResponseDTO extends BaseResponse {
  data: {
    createdCount: number;
    offers: OfferResponseDTO[];
  };
}

export interface OfferBulkUpdateDTO {
  offerIds: string[];
  updates: Partial<OfferUpdateDTO>;
}

export interface OfferBulkUpdateResponseDTO extends BaseResponse {
  data: {
    updatedCount: number;
    message: string;
    updatedAt: Date;
  };
}

export interface OfferBulkDeleteDTO {
  offerIds: string[];
  reason?: string;
}

export interface OfferBulkDeleteResponseDTO extends BaseResponse {
  data: {
    deletedCount: number;
    message: string;
    deletedAt: Date;
  };
}

export interface OfferExportDTO {
  outletId?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  format: 'csv' | 'excel' | 'json';
}

export interface OfferExportResponseDTO extends BaseResponse {
  data: {
    downloadUrl: string;
    fileName: string;
    format: string;
    recordCount: number;
  };
}

export interface OfferDuplicateDTO {
  offerId: string;
  newOutletId?: string;
  newValidFrom?: Date;
  newValidTo?: Date;
}

export interface OfferDuplicateResponseDTO extends BaseResponse {
  data: {
    originalOffer: OfferResponseDTO;
    duplicatedOffer: OfferResponseDTO;
  };
}
