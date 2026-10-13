export type BusinessRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface BusinessSummary {
  id: string;
  name: string;
  role: BusinessRole;
}

export interface AuthProfile {
  user: AuthUser;
  businesses: BusinessSummary[];
}

export interface AuthResponse extends AuthProfile {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  businessName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
