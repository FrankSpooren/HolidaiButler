import apiClient from '@/shared/utils/api';
import type { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth.types';
import { useAuthStore } from '../stores/authStore';

/**
 * Authentication Service
 * Handles all auth-related API calls
 */
export const authService = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', credentials);

    if (!data.success) {
      throw new Error('Login failed');
    }

    // Store tokens in localStorage
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    // Update auth store
    const { setAuth } = useAuthStore.getState();
    setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);

    return data.data;
  },

  /**
   * Register new user
   */
  async signup(registerData: RegisterData): Promise<AuthResponse> {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/signup', registerData);

    if (!data.success) {
      throw new Error('Signup failed');
    }

    // Store tokens in localStorage
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    // Update auth store
    const { setAuth } = useAuthStore.getState();
    setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);

    return data.data;
  },

  /**
   * Logout user - clear tokens and state
   */
  logout(): void {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Clear auth store
    const { logout } = useAuthStore.getState();
    logout();

    // Redirect to login page
    window.location.href = '/login';
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const { data } = await apiClient.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh',
      { refreshToken }
    );

    if (!data.success) {
      throw new Error('Token refresh failed');
    }

    // Store new tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    // Update auth store tokens
    const { setTokens } = useAuthStore.getState();
    setTokens(data.data.accessToken, data.data.refreshToken);

    return data.data;
  },

  /**
   * Get current user from API
   */
  async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.get<{ success: boolean; data: User }>('/auth/me');

    if (!data.success) {
      throw new Error('Failed to get current user');
    }

    // Update user in store
    const { setUser } = useAuthStore.getState();
    setUser(data.data);

    return data.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken');
    const { isAuthenticated } = useAuthStore.getState();
    return !!token && isAuthenticated;
  },

  /**
   * Facebook OAuth Login
   *
   * NOTE: Requires Facebook SDK integration
   * Install: npm install react-facebook-login
   * Docs: https://developers.facebook.com/docs/facebook-login/web
   */
  async loginWithFacebook(accessToken: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>(
      '/auth/oauth/facebook',
      { accessToken }
    );

    if (!data.success) {
      throw new Error('Facebook login failed');
    }

    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    // Update auth store
    const { setAuth } = useAuthStore.getState();
    setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);

    return data.data;
  },

  /**
   * Apple ID OAuth Login
   *
   * NOTE: Requires Apple Sign In SDK integration
   * Install: npm install react-apple-signin-auth
   * Docs: https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js
   */
  async loginWithApple(identityToken: string, user?: { name?: { firstName: string; lastName: string }; email?: string }): Promise<AuthResponse> {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>(
      '/auth/oauth/apple',
      { identityToken, user }
    );

    if (!data.success) {
      throw new Error('Apple login failed');
    }

    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    // Update auth store
    const { setAuth } = useAuthStore.getState();
    setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);

    return data.data;
  },
};

export default authService;
