import { BaseEntityDTO, BaseResponse } from "./base.dto";

/**
 * Payment-related DTOs for transaction management
 */

export interface PaymentCreateDTO {
  userId: string;
  outletId?: string;
  offerId?: string;
  amount: number;
  type: "recharge" | "dine-in" | "refund" | "membership_purchase" | "event";
  paymentMethod: "wallet" | "razorpay" | "upi" | "cash" | "card";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  dineInSessionId?: string;
  sessionId?: string;
  requiredCoins?: number;
  currentCoins?: number;
  finalAmount?: number;
  totalBill?: number;
  orderDetails?: any;
  paidAt?: Date;
  orderId?: string;
  coinsUsed?: number;
  cashAmount?: number;
  status?:
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | "insufficient_coins"
    | "otp_required";
  nonCoinPaymentMethod?: "upi" | "cash" | "card";
}

export interface PaymentUpdateDTO {
  status?:
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | "insufficient_coins"
    | "otp_required";
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: Date;
}

export interface PaymentResponseDTO extends BaseEntityDTO {
  userId: string;
  outletId?: string;
  offerId?: string;
  amount: number;
  type: "recharge" | "dine-in" | "refund" | "membership_purchase" | "event";
  status:
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | "insufficient_coins"
    | "otp_required";
  paymentMethod: "wallet" | "razorpay" | "upi" | "cash" | "card";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  dineInSessionId?: string;
  sessionId?: string;
  requiredCoins?: number;
  currentCoins?: number;
  finalAmount?: number;
  totalBill?: number;
  orderDetails?: any;
  paidAt?: Date;
  orderId?: string;
  coinsUsed?: number;
  cashAmount?: number;
  nonCoinPaymentMethod?: "upi" | "cash" | "card";
}

export interface PaymentSearchDTO {
  userId?: string;
  outletId?: string;
  offerId?: string;
  type?: "recharge" | "dine-in" | "refund" | "membership_purchase" | "event";
  status?:
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | "insufficient_coins"
    | "otp_required";
  paymentMethod?: "wallet" | "razorpay" | "upi" | "cash" | "card";
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaymentStatsDTO {
  totalPayments: number;
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  refundedPayments: number;
  averageAmount: number;
  paymentMethodBreakdown: {
    wallet: number;
    razorpay: number;
    upi: number;
    cash: number;
    card: number;
  };
  typeBreakdown: {
    recharge: number;
    "dine-in": number;
    refund: number;
    membership_purchase: number;
    event: number;
  };
}

export interface PaymentStatsResponseDTO extends BaseResponse {
  data: PaymentStatsDTO;
}

export interface InsufficientCoinsResponseDTO extends BaseResponse {
  data: {
    status: "insufficient_coins";
    requiredCoins: number;
    currentCoins: number;
    finalAmount: number;
    _id: null;
    orderDetails: null;
  };
}

export interface OTPRequiredResponseDTO extends BaseResponse {
  data: {
    status: "otp_required";
    message: string;
    finalAmount: number;
  };
}

export interface DirectPaymentResponseDTO extends BaseResponse {
  data: {
    order: any; // Razorpay order object
    paymentId: unknown;
    keyId: string;
  };
}

export interface PaymentRefundDTO {
  paymentId: string;
  amount?: number;
  reason: string;
}

export interface PaymentRefundResponseDTO extends BaseResponse {
  data: {
    refundId: string;
    amount: number;
    status: string;
    reason: string;
    processedAt: Date;
  };
}

export interface WalletRechargeDTO {
  userId: string;
  amount: number;
  paymentMethod: "razorpay" | "upi" | "card";
  razorpayOrderId?: string;
}

export interface WalletRechargeResponseDTO extends BaseResponse {
  data: {
    paymentId: string;
    amount: number;
    status: string;
    razorpayOrderId?: string;
    keyId?: string;
  };
}

export interface PaymentVerificationDTO {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PaymentVerificationResponseDTO extends BaseResponse {
  data: {
    verified: boolean;
    paymentId: string;
    status: string;
  };
}
