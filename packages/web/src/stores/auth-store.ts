import { create } from 'zustand';
import { User, Company, UserRole } from '@handycall/shared';
import { apiClient } from '@/lib/api-client';
import { extractUserRole } from '@/lib/jwt';
import { signOut } from 'next-auth/react';

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
  changePassword: (email: string, newPassword: string, session: string, poolType?: 'users' | 'admin', companyName?: string, firstName?: string, lastName?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, idToken: string, refreshToken: string) => void;
  checkAuth: () => Promise<void>;
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
    // Login is handled by NextAuth credentials; this store just tracks derived state.
    set({ isLoading: false });
    return { requiresPasswordChange: false, userRole: null };
  },

  changePassword: async (email: string, newPassword: string, session: string, poolType?: 'users' | 'admin', companyName?: string, firstName?: string, lastName?: string) => {
    try {
      // Use provided poolType or get from store
      const poolTypeToUse = poolType || get().passwordChangePoolType || 'users';
      const response = await apiClient.changePassword(email, newPassword, session, poolTypeToUse, companyName, firstName, lastName);

      // Ensure response has required fields
      if (!response || !response.access_token) {
        throw new Error('Invalid password change response');
      }

      // Extract user role - check response first, then fall back to token extraction
      let userRole: UserRole | null = null;
      
      // Check if backend explicitly provided userRole
      if (response.userRole) {
        userRole = response.userRole as UserRole;
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
        user: response.user || null,
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

  logout: async () => {
    // Clear local client state
    apiClient.setAccessToken(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('email');
      localStorage.removeItem('user_role');
      // Trigger NextAuth sign-out so server session is cleared
      await signOut({ callbackUrl: '/login' });
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

  checkAuth: async () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    try {
      // Get NextAuth session info to populate user/email/role
      const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
      const session = sessionResponse.ok ? await sessionResponse.json() : null;

      const sessionRole = (session as any)?.userRole as UserRole | undefined;
      const sessionEmail = (session as any)?.user?.email as string | undefined;

      // If admin role, skip company fetch to avoid 401 and just mark authenticated
      if (sessionRole === UserRole.ADMIN) {
        const email = sessionEmail || localStorage.getItem('email') || null;
        if (email) localStorage.setItem('email', email);
        localStorage.setItem('user_role', UserRole.ADMIN);

        set({
          company: null,
          user: session?.user ? ({ email: sessionEmail, first_name: (session as any)?.user?.name } as User) : null,
          email,
          userRole: UserRole.ADMIN,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      // Customer flow: fetch company data via proxy to confirm auth and hydrate the store
      const company = await apiClient.getMyCompany();

      const email =
        sessionEmail ||
        company?.email ||
        localStorage.getItem('email') ||
        null;

      const userRole =
        (company as any)?.userRole ||
        (localStorage.getItem('user_role') as UserRole | null) ||
        UserRole.OWNER;

      if (email) localStorage.setItem('email', email);
      if (userRole) localStorage.setItem('user_role', userRole);

      // Build a minimal user object from session/company to drive the UI
      const user: Partial<User> | null = session?.user
        ? {
            email: session.user.email || undefined,
            first_name: (session.user as any)?.name || undefined,
          }
        : null;

      set({
        company,
        user: (user as User) || null,
        email,
        userRole,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
