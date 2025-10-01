import { BaseResponse } from './base.dto';

/**
 * Authentication-related DTOs for login, registration, and token management
 */

export interface AdminLoginDTO {
  email: string;
  password: string;
}

export interface UserLoginDTO {
  email?: string;
  phone?: string;
  password: string;
}

export interface AdminRegisterDTO {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'outlet_admin';
  phone?: string;
}

export interface UserRegisterDTO {
  name: string;
  email?: string;
  password?: string;
  phone: string;
  dob?: Date;
  gender?: 'male' | 'female' | 'other';
  referralCode?: string;
}

export interface UserRegisterResponseDTO extends BaseResponse {
  data: {
    user: {
      _id: string;
      name: string;
      email?: string;
      phone: string;
      role: string;
      isActive: boolean;
      isEmailVerified?: boolean;
      isPhoneVerified?: boolean;
    };
    token: string;
    expiresIn: number;
  };
}

export interface AdminRegisterResponseDTO extends BaseResponse {
  data: {
    admin: {
      _id: string;
      name: string;
      email: string;
      role: 'admin' | 'outlet_admin';
      phone?: string;
      isActive: boolean;
      isEmailVerified: boolean;
    };
    token: string;
    expiresIn: number;
  };
}

export interface LoginResponseDTO extends BaseResponse {
  data: {
    user: {
      _id: string;
      name: string;
      email?: string;
      phone: string;
      role: string;
      isActive: boolean;
      isEmailVerified?: boolean;
      isPhoneVerified?: boolean;
    };
    token: string;
    refreshToken?: string;
    expiresIn: number;
  };
}

export interface AdminLoginResponseDTO extends BaseResponse {
  data: {
    admin: {
      _id: string;
      name: string;
      email: string;
      role: 'admin' | 'outlet_admin';
      phone?: string;
      isActive: boolean;
      isEmailVerified: boolean;
    };
    token: string;
    refreshToken?: string;
    expiresIn: number;
  };
}

export interface TokenRefreshDTO {
  refreshToken: string;
}

export interface TokenRefreshResponseDTO extends BaseResponse {
  data: {
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface PasswordResetRequestDTO {
  email: string;
}

export interface PasswordResetConfirmDTO {
  token: string;
  newPassword: string;
}

export interface PasswordChangeDTO {
  currentPassword: string;
  newPassword: string;
}

export interface EmailVerificationDTO {
  email: string;
}

export interface PhoneVerificationDTO {
  phone: string;
}

export interface VerificationConfirmDTO {
  email?: string;
  phone?: string;
  verificationCode: string;
}

export interface LogoutDTO {
  refreshToken?: string;
}

export interface LogoutResponseDTO extends BaseResponse {
  data: {
    message: string;
  };
}

export interface AuthStatusDTO {
  isAuthenticated: boolean;
  user?: {
    _id: string;
    name: string;
    email?: string;
    phone: string;
    role: string;
  };
  admin?: {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'outlet_admin';
  };
}

export interface AuthStatusResponseDTO extends BaseResponse {
  data: AuthStatusDTO;
}

export interface GuestLoginDTO {
  phone: string;
  name?: string;
}

export interface GuestLoginResponseDTO extends BaseResponse {
  data: {
    user: {
      _id: string;
      name: string;
      phone: string;
      role: 'guest_event';
      isGuest: boolean;
    };
    token: string;
    expiresIn: number;
  };
}
