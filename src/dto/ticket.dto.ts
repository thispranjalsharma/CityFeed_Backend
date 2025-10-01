import { BaseEntityDTO, BaseResponse } from './base.dto';

/**
 * Ticket-related DTOs for ticket tier management
 */

export interface TicketTierCreateDTO {
  eventId: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  order: number;
  isActive?: boolean;
}

export interface TicketTierUpdateDTO {
  name?: string;
  price?: number;
  quantity?: number;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface TicketTierResponseDTO extends BaseEntityDTO {
  eventId: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  order: number;
  isActive: boolean;
  soldCount: number;
  availableCount: number;
  eventDetails?: {
    _id: string;
    name: string;
    date?: Date;
    startEventDate?: Date;
    endEventDate?: Date;
  };
}

export interface TicketTierSearchDTO {
  eventId?: string;
  name?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TicketTierStatsDTO {
  totalTiers: number;
  activeTiers: number;
  inactiveTiers: number;
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  totalRevenue: number;
  averagePrice: number;
  recentTiers: TicketTierResponseDTO[];
}

export interface TicketTierStatsResponseDTO extends BaseResponse {
  data: TicketTierStatsDTO;
}

export interface TicketTierActivationDTO {
  tierId: string;
  isActive: boolean;
}

export interface TicketTierActivationResponseDTO extends BaseResponse {
  data: {
    tierId: string;
    isActive: boolean;
    updatedAt: Date;
  };
}

export interface TicketTierReorderDTO {
  tierId: string;
  newOrder: number;
}

export interface TicketTierReorderResponseDTO extends BaseResponse {
  data: {
    tierId: string;
    oldOrder: number;
    newOrder: number;
    updatedAt: Date;
  };
}

export interface TicketTierBulkCreateDTO {
  eventId: string;
  tiers: Omit<TicketTierCreateDTO, 'eventId'>[];
}

export interface TicketTierBulkCreateResponseDTO extends BaseResponse {
  data: {
    createdCount: number;
    tiers: TicketTierResponseDTO[];
  };
}

export interface TicketTierBulkUpdateDTO {
  tierIds: string[];
  updates: Partial<TicketTierUpdateDTO>;
}

export interface TicketTierBulkUpdateResponseDTO extends BaseResponse {
  data: {
    updatedCount: number;
    message: string;
    updatedAt: Date;
  };
}

export interface TicketTierBulkDeleteDTO {
  tierIds: string[];
  reason?: string;
}

export interface TicketTierBulkDeleteResponseDTO extends BaseResponse {
  data: {
    deletedCount: number;
    message: string;
    deletedAt: Date;
  };
}

export interface TicketTierExportDTO {
  eventId?: string;
  isActive?: boolean;
  format: 'csv' | 'excel' | 'json';
}

export interface TicketTierExportResponseDTO extends BaseResponse {
  data: {
    downloadUrl: string;
    fileName: string;
    format: string;
    recordCount: number;
  };
}

export interface TicketTierDuplicateDTO {
  tierId: string;
  newEventId?: string;
  newName?: string;
}

export interface TicketTierDuplicateResponseDTO extends BaseResponse {
  data: {
    originalTier: TicketTierResponseDTO;
    duplicatedTier: TicketTierResponseDTO;
  };
}

export interface TicketTierAvailabilityDTO {
  tierId: string;
  requestedQuantity: number;
}

export interface TicketTierAvailabilityResponseDTO extends BaseResponse {
  data: {
    tierId: string;
    available: boolean;
    availableQuantity: number;
    requestedQuantity: number;
    tier: TicketTierResponseDTO;
  };
}

export interface TicketTierPriceUpdateDTO {
  tierId: string;
  newPrice: number;
  reason?: string;
}

export interface TicketTierPriceUpdateResponseDTO extends BaseResponse {
  data: {
    tierId: string;
    oldPrice: number;
    newPrice: number;
    reason?: string;
    updatedAt: Date;
  };
}
