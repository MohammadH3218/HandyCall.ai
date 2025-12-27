import { create } from 'zustand';
import { User, Company } from '@handycall/shared';
import { apiClient } from '@/lib/api-client';
import { extractUserRole } from '@/lib/jwt';

type UserRole = 'admin' | 'customer';

interface AuthState {
  user: User | null;
  company: Company | null;
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  email: string | null;
  userRole: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  passwordChangeSession: string | null;

  // Actions
  login: (email: string, password: string) => Promise<{ requiresPasswordChange: boolean; userRole: UserRole | null }>;
  changePassword: (email: string, newPassword: string, session: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, idToken: string, refreshToken: string) => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  company: null,
  accessToken: null,
  idToken: null,
  refreshToken: null,
  email: null,
  userRole: null,
  isAuthenticated: false,
  isLoading: true,
  requiresPasswordChange: false,
  passwordChangeSession: null,

  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.login({ email, password });

      // Handle null/undefined response
      if (!response) {
        throw new Error('No response received from server');
      }

      // Check if password change is required (safely handle undefined/null response)
      if (response.requiresPasswordChange === true) {
        set({
          requiresPasswordChange: true,
          passwordChangeSession: response.session || null,
          email,
          isLoading: false,
        });
        return { requiresPasswordChange: true, userRole: null };
      }

      // Ensure response has required fields for successful login
      if (!response.access_token) {
        throw new Error('Invalid login response: missing access token');
      }

      // Extract user role from ID token
      const userRole = response.id_token ? extractUserRole(response.id_token) : null;

      // Set tokens
      apiClient.setAccessToken(response.access_token);

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('id_token', response.id_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        localStorage.setItem('email', email);
        if (userRole) {
          localStorage.setItem('user_role', userRole);
        }
      }

      set({
        company: response.company,
        accessToken: response.access_token,
        idToken: response.id_token,
        refreshToken: response.refresh_token,
        email,
        userRole,
        isAuthenticated: true,
        isLoading: false,
        requiresPasswordChange: false,
        passwordChangeSession: null,
      });

      return { requiresPasswordChange: false, userRole };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  changePassword: async (email: string, newPassword: string, session: string) => {
    try {
      const response = await apiClient.changePassword(email, newPassword, session);

      // Ensure response has required fields
      if (!response || !response.access_token) {
        throw new Error('Invalid password change response');
      }

      // Extract user role from ID token
      const userRole = response.id_token ? extractUserRole(response.id_token) : null;

      // Set tokens after password change
      apiClient.setAccessToken(response.access_token);

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('id_token', response.id_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        localStorage.setItem('email', email);
        if (userRole) {
          localStorage.setItem('user_role', userRole);
        }
      }

      set({
        company: response.company,
        accessToken: response.access_token,
        idToken: response.id_token,
        refreshToken: response.refresh_token,
        email,
        userRole,
        isAuthenticated: true,
        isLoading: false,
        requiresPasswordChange: false,
        passwordChangeSession: null,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: any) => {
    try {
      const response = await apiClient.register(data);

      // Set tokens
      apiClient.setAccessToken(response.access_token);

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
      }

      set({
        user: response.user,
        company: response.company,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    apiClient.setAccessToken(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('email');
      localStorage.removeItem('user_role');
    }

    set({
      user: null,
      company: null,
      accessToken: null,
      idToken: null,
      refreshToken: null,
      email: null,
      userRole: null,
      isAuthenticated: false,
      isLoading: false,
      requiresPasswordChange: false,
      passwordChangeSession: null,
    });
  },

  setTokens: (accessToken: string, idToken: string, refreshToken: string) => {
    apiClient.setAccessToken(accessToken);

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('id_token', idToken);
      localStorage.setItem('refresh_token', refreshToken);
    }

    set({
      accessToken,
      idToken,
      refreshToken,
    });
  },

  checkAuth: () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    const accessToken = localStorage.getItem('access_token');
    const idToken = localStorage.getItem('id_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const email = localStorage.getItem('email');
    const userRole = localStorage.getItem('user_role') as UserRole | null;

    if (accessToken && refreshToken && email) {
      // If role not in localStorage, try to extract from token
      const extractedRole = idToken ? extractUserRole(idToken) : userRole;
      
      apiClient.setAccessToken(accessToken);
      set({
        accessToken,
        idToken,
        refreshToken,
        email,
        userRole: extractedRole || userRole,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },
}));
