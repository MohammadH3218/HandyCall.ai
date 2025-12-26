import { create } from 'zustand';
import { User, Company } from '@handycall/shared';
import { apiClient } from '@/lib/api-client';

interface AuthState {
  user: User | null;
  company: Company | null;
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  passwordChangeSession: string | null;

  // Actions
  login: (email: string, password: string) => Promise<{ requiresPasswordChange: boolean }>;
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
  isAuthenticated: false,
  isLoading: true,
  requiresPasswordChange: false,
  passwordChangeSession: null,

  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.login({ email, password });

      // Check if password change is required
      if (response.requiresPasswordChange) {
        set({
          requiresPasswordChange: true,
          passwordChangeSession: response.session,
          email,
          isLoading: false,
        });
        return { requiresPasswordChange: true };
      }

      // Set tokens
      apiClient.setAccessToken(response.access_token);

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('id_token', response.id_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        localStorage.setItem('email', email);
      }

      set({
        company: response.company,
        accessToken: response.access_token,
        idToken: response.id_token,
        refreshToken: response.refresh_token,
        email,
        isAuthenticated: true,
        isLoading: false,
        requiresPasswordChange: false,
        passwordChangeSession: null,
      });

      return { requiresPasswordChange: false };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  changePassword: async (email: string, newPassword: string, session: string) => {
    try {
      const response = await apiClient.changePassword(email, newPassword, session);

      // Set tokens after password change
      apiClient.setAccessToken(response.access_token);

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('id_token', response.id_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        localStorage.setItem('email', email);
      }

      set({
        company: response.company,
        accessToken: response.access_token,
        idToken: response.id_token,
        refreshToken: response.refresh_token,
        email,
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
    }

    set({
      user: null,
      company: null,
      accessToken: null,
      idToken: null,
      refreshToken: null,
      email: null,
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

    if (accessToken && refreshToken && email) {
      apiClient.setAccessToken(accessToken);
      set({
        accessToken,
        idToken,
        refreshToken,
        email,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },
}));
