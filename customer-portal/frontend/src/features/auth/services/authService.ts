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
   * Returns AuthResponse or 2FA pending response
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse & { requires2FA?: boolean; pendingToken?: string }> {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse; requires2FA?: boolean }>('/auth/login', credentials);

    if (!data.success) {
      throw new Error('Login failed');
    }

    // Check if 2FA is required
    if (data.requires2FA || data.data?.requires2FA) {
      return {
        ...data.data,
        requires2FA: true,
        pendingToken: data.data?.pendingToken
      };
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

  // ==========================================
  // TWO-FACTOR AUTHENTICATION
  // ==========================================

  /**
   * Get 2FA status for current user
   */
  async get2FAStatus(): Promise<{ enabled: boolean; enabledAt: string | null }> {
    const { data } = await apiClient.get<{ success: boolean; data: { enabled: boolean; enabledAt: string | null } }>(
      '/auth/2fa/status'
    );
    return data.data;
  },

  /**
   * Setup 2FA - returns secret and QR code URI
   */
  async setup2FA(): Promise<{ secret: string; otpauthUri: string }> {
    const { data } = await apiClient.post<{ success: boolean; data: { secret: string; otpauthUri: string } }>(
      '/auth/2fa/setup'
    );

    if (!data.success) {
      throw new Error('2FA setup failed');
    }

    return data.data;
  },

  /**
   * Verify 2FA code and enable 2FA
   */
  async verify2FA(code: string): Promise<{ enabled: boolean; backupCodes: string[] }> {
    const { data } = await apiClient.post<{ success: boolean; data: { enabled: boolean; backupCodes: string[] } }>(
      '/auth/2fa/verify',
      { code }
    );

    if (!data.success) {
      throw new Error('2FA verification failed');
    }

    return data.data;
  },

  /**
   * Disable 2FA
   */
  async disable2FA(codeOrPassword: string, usePassword = false): Promise<void> {
    const payload = usePassword ? { password: codeOrPassword } : { code: codeOrPassword };
    const { data } = await apiClient.post<{ success: boolean }>(
      '/auth/2fa/disable',
      payload
    );

    if (!data.success) {
      throw new Error('Failed to disable 2FA');
    }
  },

  /**
   * Validate 2FA code during login
   */
  async validate2FA(code: string, pendingToken: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>(
      '/auth/2fa/validate',
      { code, pendingToken }
    );

    if (!data.success) {
      throw new Error('2FA validation failed');
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
