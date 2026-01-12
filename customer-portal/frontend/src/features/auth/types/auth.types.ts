export interface User {
  id: number;
  uuid?: string;
  email: string;
  name: string | null;
  firstName?: string;
  lastName?: string;
  role: string;
  permissions?: string[];
  avatarUrl?: string | null;
  createdAt?: string;
  onboardingCompleted?: boolean;
  totpEnabled?: boolean;
  isActive?: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  requires2FA?: boolean;
  pendingToken?: string;
}
