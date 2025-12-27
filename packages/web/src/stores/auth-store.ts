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
  passwordChangePoolType: 'users' | 'admin' | null;

  // Actions
  login: (email: string, password: string) => Promise<{ requiresPasswordChange: boolean; userRole: UserRole | null }>;
  changePassword: (email: string, newPassword: string, session: string, poolType?: 'users' | 'admin') => Promise<void>;
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
  passwordChangePoolType: null,

  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.login({ email, password });

      // Handle null/undefined response
      if (!response) {
        throw new Error('No response received from server');
      }

      // Check if password change is required (safely handle undefined/null response)
      if (response.requiresPasswordChange === true) {
        // Extract user role from response if provided
        const userRole = response.userRole ? (response.userRole === 'admin' ? 'admin' : 'customer') : null;
        const poolType = response.poolType || 'users';
        
        set({
          requiresPasswordChange: true,
          passwordChangeSession: response.session || null,
          passwordChangePoolType: poolType,
          email,
          userRole,
          isLoading: false,
        });
        return { requiresPasswordChange: true, userRole };
      }

      // Ensure response has required fields for successful login
      if (!response.access_token) {
        throw new Error('Invalid login response: missing access token');
      }

      // Extract user role - check response first, then fall back to token extraction
      let userRole: UserRole | null = null;
      
      // Check if backend explicitly provided userRole
      if (response.userRole) {
        userRole = response.userRole === 'admin' ? 'admin' : 'customer';
      } else if (response.id_token) {
        // Fall back to extracting from token
        userRole = extractUserRole(response.id_token);
      }

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
        company: response.company || null,
        accessToken: response.access_token,
        idToken: response.id_token,
        refreshToken: response.refresh_token,
        email,
        userRole,
        isAuthenticated: true,
        isLoading: false,
        requiresPasswordChange: false,
        passwordChangeSession: null,
        passwordChangePoolType: null,
      });

      return { requiresPasswordChange: false, userRole };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  changePassword: async (email: string, newPassword: string, session: string, poolType?: 'users' | 'admin') => {
    try {
      // Use provided poolType or get from store
      const poolTypeToUse = poolType || get().passwordChangePoolType || 'users';
      const response = await apiClient.changePassword(email, newPassword, session, poolTypeToUse);

      // Ensure response has required fields
      if (!response || !response.access_token) {
        throw new Error('Invalid password change response');
      }

      // Extract user role - check response first, then fall back to token extraction
      let userRole: UserRole | null = null;
      
      // Check if backend explicitly provided userRole
      if (response.userRole) {
        userRole = response.userRole === 'admin' ? 'admin' : 'customer';
      } else if (response.id_token) {
        // Fall back to extracting from token
        userRole = extractUserRole(response.id_token);
      }

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
        company: response.company || null,
        accessToken: response.access_token,
        idToken: response.id_token,
        refreshToken: response.refresh_token,
        email,
        userRole,
        isAuthenticated: true,
        isLoading: false,
        requiresPasswordChange: false,
        passwordChangeSession: null,
        passwordChangePoolType: null,
      });
    } catch (error: any) {
      set({ isLoading: false });
      // Re-throw with better error message if available
      if (error.message) {
        throw error;
      }
      throw new Error('Failed to change password. Please try again.');
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
      passwordChangePoolType: null,
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
