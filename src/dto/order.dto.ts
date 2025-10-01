import { BaseEntityDTO, BaseResponse } from "./base.dto";

/**
 * Order-related DTOs for ticket ordering and management
 */

export interface OrderTicketDTO {
  ticketTierId: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface OrderCreateDTO {
  event: string;
  user: string;
  tickets: OrderTicketDTO[];
  expiresAt?: Date;
}

export interface OrderUpdateDTO {
  status?:
    | "pending"
    | "paid"
    | "cancelled"
    | "cancellation_requested"
    | "refunded";
  expiresAt?: Date;
}

export interface OrderResponseDTO extends BaseEntityDTO {
  event: string;
  user: string;
  tickets: OrderTicketDTO[];
  status:
    | "pending"
    | "paid"
    | "cancelled"
    | "cancellation_requested"
    | "refunded";
  expiresAt?: Date;
  eventDetails?: {
    _id: string;
    name: string;
    date?: Date;
    startEventDate?: Date;
    endEventDate?: Date;
    startTime: string;
    endTime: string;
    venue: {
      name: string;
      address: string;
    };
  };
  userDetails?: {
    _id: string;
    name: string;
    email?: string;
    phone: string;
  };
  totalAmount: number;
  totalTickets: number;
}

export interface OrderSearchDTO {
  event?: string;
  user?: string;
  status?:
    | "pending"
    | "paid"
    | "cancelled"
    | "cancellation_requested"
    | "refunded";
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface OrderStatsDTO {
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalTicketsSold: number;
  recentOrders: OrderResponseDTO[];
}

export interface OrderStatsResponseDTO extends BaseResponse {
  data: OrderStatsDTO;
}

export interface OrderCancellationDTO {
  orderId: string;
  reason?: string;
}

export interface OrderCancellationResponseDTO extends BaseResponse {
  data: {
    orderId: string;
    status: "cancelled";
    cancelledAt: Date;
    reason?: string;
  };
}

export interface OrderRefundDTO {
  orderId: string;
  reason: string;
  refundAmount?: number;
}

export interface OrderRefundResponseDTO extends BaseResponse {
  data: {
    orderId: string;
    status: "refunded";
    refundedAt: Date;
    refundAmount: number;
    reason: string;
  };
}

export interface OrderPaymentDTO {
  orderId: string;
  paymentMethod: "wallet" | "razorpay" | "upi" | "cash" | "card";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export interface OrderPaymentResponseDTO extends BaseResponse {
  data: {
    orderId: string;
    status: "paid";
    paidAt: Date;
    paymentId: string;
    paymentMethod: string;
  };
}

export interface OrderExpiryDTO {
  orderId: string;
  expiresAt: Date;
}

export interface OrderExpiryResponseDTO extends BaseResponse {
  data: {
    orderId: string;
    expiresAt: Date;
    timeRemaining: number; // in seconds
  };
}

export interface OrderExportDTO {
  eventId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  status?:
    | "pending"
    | "paid"
    | "cancelled"
    | "cancellation_requested"
    | "refunded";
  format: "csv" | "excel" | "json";
}

export interface OrderExportResponseDTO extends BaseResponse {
  data: {
    downloadUrl: string;
    fileName: string;
    format: string;
    recordCount: number;
  };
}

export interface OrderBulkUpdateDTO {
  orderIds: string[];
  status:
    | "pending"
    | "paid"
    | "cancelled"
    | "cancellation_requested"
    | "refunded";
  reason?: string;
}

export interface OrderBulkUpdateResponseDTO extends BaseResponse {
  data: {
    updatedCount: number;
    message: string;
    updatedAt: Date;
  };
}
