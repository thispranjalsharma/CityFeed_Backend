import { BaseEntityDTO, BaseResponse, LocationDTO } from './base.dto';

/**
 * Event-related DTOs for event management and ticketing
 */

export interface VenueDTO {
  name: string;
  address: string;
  capacity: number;
  location: LocationDTO;
}

export interface TicketTierDTO {
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  order: number;
  isActive: boolean;
  soldCount: number;
}

export interface AssignedStaffDTO {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface EventCreateDTO {
  name: string;
  description: string;
  type: string;
  coverImages: string[];
  date?: Date;
  startEventDate?: Date;
  endEventDate?: Date;
  startTime: string;
  endTime: string;
  venue: VenueDTO;
  saleStart: Date;
  saleEnd: Date;
  refundPolicy: string;
  specialInstructions?: string;
  status?: 'draft' | 'published';
  createdBy: string;
  managerId?: string;
  ticketPrice?: number;
  ticketTiers?: TicketTierDTO[];
  assignStaffs?: AssignedStaffDTO[];
}

export interface EventUpdateDTO {
  name?: string;
  description?: string;
  type?: string;
  coverImages?: string[];
  date?: Date;
  startEventDate?: Date;
  endEventDate?: Date;
  startTime?: string;
  endTime?: string;
  venue?: VenueDTO;
  saleStart?: Date;
  saleEnd?: Date;
  refundPolicy?: string;
  specialInstructions?: string;
  status?: 'draft' | 'published';
  managerId?: string;
  ticketPrice?: number;
  ticketTiers?: TicketTierDTO[];
  assignStaffs?: AssignedStaffDTO[];
}

export interface EventResponseDTO extends BaseEntityDTO {
  name: string;
  description: string;
  type: string;
  coverImages: string[];
  date?: Date;
  startEventDate?: Date;
  endEventDate?: Date;
  startTime: string;
  endTime: string;
  venue: VenueDTO;
  saleStart: Date;
  saleEnd: Date;
  refundPolicy: string;
  specialInstructions?: string;
  status: 'draft' | 'published';
  createdBy: string;
  managerId?: string;
  ticketPrice?: number;
  totalSoldCount?: number;
  ticketTiers: TicketTierDTO[];
  assignStaffs?: AssignedStaffDTO[];
  isCancelled: boolean;
  cancelledBy?: string;
  cancelledAt?: Date;
  cancellationDescription?: string;
  cancellationInstructions?: string;
}

export interface EventSearchDTO {
  name?: string;
  type?: string;
  status?: 'draft' | 'published';
  createdBy?: string;
  managerId?: string;
  startDate?: Date;
  endDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  location?: {
    lat: number;
    lng: number;
    radius: number; // in kilometers
  };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EventStatsDTO {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  cancelledEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  averageTicketPrice: number;
  upcomingEvents: number;
  pastEvents: number;
}

export interface EventStatsResponseDTO extends BaseResponse {
  data: EventStatsDTO;
}

export interface EventCancellationDTO {
  eventId: string;
  cancellationDescription: string;
  cancellationInstructions?: string;
}

export interface EventCancellationResponseDTO extends BaseResponse {
  data: {
    eventId: string;
    isCancelled: boolean;
    cancelledAt: Date;
    cancellationDescription: string;
    cancellationInstructions?: string;
  };
}

export interface EventPublishDTO {
  eventId: string;
  publishDate?: Date;
}

export interface EventPublishResponseDTO extends BaseResponse {
  data: {
    eventId: string;
    status: 'published';
    publishedAt: Date;
  };
}

export interface EventDraftDTO {
  eventId: string;
}

export interface EventDraftResponseDTO extends BaseResponse {
  data: {
    eventId: string;
    status: 'draft';
    updatedAt: Date;
  };
}

export interface EventTicketStatsDTO {
  eventId: string;
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  revenue: number;
  tierBreakdown: {
    tierId: string;
    tierName: string;
    totalQuantity: number;
    soldQuantity: number;
    availableQuantity: number;
    price: number;
    revenue: number;
  }[];
}

export interface EventTicketStatsResponseDTO extends BaseResponse {
  data: EventTicketStatsDTO;
}

export interface EventExportDTO {
  eventId?: string;
  startDate?: Date;
  endDate?: Date;
  format: 'csv' | 'excel' | 'json';
  includeTickets?: boolean;
  includeStaff?: boolean;
}

export interface EventExportResponseDTO extends BaseResponse {
  data: {
    downloadUrl: string;
    fileName: string;
    format: string;
    recordCount: number;
  };
}
