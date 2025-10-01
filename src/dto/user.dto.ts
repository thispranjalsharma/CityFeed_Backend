import { BaseEntityDTO, AddressDTO, PreferencesDTO } from "./base.dto";

/**
 * User-related DTOs for data transfer operations
 */

export interface UserCreateDTO {
  name: string;
  email?: string;
  password?: string;
  dob?: Date;
  gender?: "male" | "female" | "other";
  phone: string;
  membershipType?: "cityfeed_select" | "cityfeed_edge" | "cityfeed_prime";
  membershipExpiryDate?: Date;
  role?: "user" | "admin" | "guest_event";
  profilePicture?: string;
  address?: AddressDTO;
  preferences?: PreferencesDTO;
  isGuest?: boolean;
  referralCode?: string;
  referredBy?: string;
}

export interface UserUpdateDTO {
  _id: string;
  name?: string;
  email?: string;
  password?: string;
  dob?: Date;
  gender?: "male" | "female" | "other";
  phone?: string;
  membershipType?: "cityfeed_select" | "cityfeed_edge" | "cityfeed_prime";
  membershipExpiryDate?: Date;
  role?: "user" | "admin" | "guest_event";
  profilePicture?: string;
  address?: AddressDTO;
  preferences?: PreferencesDTO;
  isActive?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isApproved?: boolean;
  qrCodeUrl?: string;
}

export interface UserResponseDTO extends BaseEntityDTO {
  name: string;
  email?: string;
  dob?: Date;
  gender?: "male" | "female" | "other";
  phone: string;
  membershipType?: "cityfeed_select" | "cityfeed_edge" | "cityfeed_prime";
  membershipExpiryDate?: Date;
  role: "user" | "admin" | "guest_event";
  coins: number;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isApproved: boolean;
  isDeleted?: boolean;
  deletedAt?: Date;
  profilePicture?: string;
  address?: AddressDTO;
  preferences?: PreferencesDTO;
  lastLogin?: Date;
  isGuest?: boolean;
  referralCode?: string;
  referredBy?: string | null;
  qrCodeUrl?: string;
  fullName: string;
}

export interface UserLoginDTO {
  email?: string;
  phone?: string;
  password: string;
}

export interface UserRegisterDTO {
  name: string;
  email?: string;
  password?: string;
  phone: string;
  dob?: Date;
  gender?: "male" | "female" | "other";
  referralCode?: string;
  membershipType?: "cityfeed_select" | "cityfeed_edge" | "cityfeed_prime";
  profilePicture?: string;
  address?: AddressDTO;
  preferences?: PreferencesDTO;
  isGuest?: boolean;
}

export interface UserProfileUpdateDTO {
  name?: string;
  email?: string;
  phone?: string;
  dob?: Date;
  gender?: "male" | "female" | "other";
  profilePicture?: string;
  address?: AddressDTO;
  preferences?: PreferencesDTO;
  membershipType?: "cityfeed_select" | "cityfeed_edge" | "cityfeed_prime";
  isEmailVerified?: boolean;
}

export interface UserPasswordChangeDTO {
  currentPassword: string;
  newPassword: string;
}

export interface UserPasswordResetDTO {
  email: string;
}

export interface UserPasswordResetConfirmDTO {
  token: string;
  newPassword: string;
}

export interface UserVerificationDTO {
  email?: string;
  phone?: string;
  verificationCode: string;
}

export interface UserMembershipUpdateDTO {
  membershipType: "cityfeed_select" | "cityfeed_edge" | "cityfeed_prime";
  membershipExpiryDate: Date;
}

export interface UserCoinsUpdateDTO {
  coins: number;
  operation: "add" | "subtract" | "set";
  reason?: string;
}

export interface UserSearchDTO {
  search?: string;
  membershipType?: "cityfeed_select" | "cityfeed_edge" | "cityfeed_prime";
  role?: "user" | "admin" | "guest_event";
  isActive?: boolean;
  isApproved?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isGuest?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
