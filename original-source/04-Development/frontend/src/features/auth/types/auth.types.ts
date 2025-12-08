export interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  permissions?: string[];
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
}
