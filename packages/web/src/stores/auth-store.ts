import { create } from 'zustand';
import { User, Company, UserRole } from '@handycall/shared';
import { apiClient } from '@/lib/api-client';
import { extractUserRole, decodeJWT } from '@/lib/jwt';
import { signIn, signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

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
    try {
      // Sign in with Cognito using Amplify
      const result = await signIn({ username: email, password });

      // Check if password change is required
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        // Handle new password required challenge
        // Note: Amplify handles password changes differently - may need backend endpoint for full flow
        set({
          requiresPasswordChange: true,
          email,
          isLoading: false,
        });
        return { requiresPasswordChange: true, userRole: null };
      }

      // If not signed in, there's a challenge
      if (!result.isSignedIn) {
        throw new Error('Login incomplete. Please complete the required challenge.');
      }

      // Get the current session and user info
      const session = await fetchAuthSession();
      const cognitoUser = await getCurrentUser();
      
      if (!session.tokens?.accessToken) {
        throw new Error('Failed to get authentication tokens');
      }

      // Decode the ID token to extract user info
      const idToken = session.tokens.idToken?.toString();
      const accessToken = session.tokens.accessToken.toString();
      const payload = idToken ? decodeJWT(idToken) : null;

      // Extract user role from token
      let userRole: UserRole | null = null;
      if (payload) {
        // Check custom:role attribute
        if (payload['custom:role']) {
          const role = payload['custom:role'].toUpperCase();
          if (role === 'ADMIN') userRole = UserRole.ADMIN;
          else if (role === 'OWNER') userRole = UserRole.OWNER;
          else if (role === 'STAFF') userRole = UserRole.STAFF;
        }
        
        // Check cognito:groups
        if (!userRole && payload['cognito:groups'] && Array.isArray(payload['cognito:groups'])) {
          if (payload['cognito:groups'].some((group: string) => group.toLowerCase().includes('admin'))) {
            userRole = UserRole.ADMIN;
          }
        }
      }

      // Default to OWNER if role cannot be determined
      if (!userRole) {
        userRole = UserRole.OWNER;
      }

      // Fetch user and company info from backend
      let company = null;
      let user = null;
      try {
        company = await apiClient.getMyCompany();
        // User info might be in the company response or we might need a separate endpoint
      } catch (error) {
        console.warn('Failed to fetch company info:', error);
      }

      // Store email
      const userEmail = payload?.email || email;

      if (typeof window !== 'undefined') {
        localStorage.setItem('email', userEmail);
        localStorage.setItem('user_role', userRole);
      }

      set({
        company,
        user,
        accessToken,
        idToken: idToken || null,
        refreshToken: null, // Refresh tokens are handled internally by Amplify
        email: userEmail,
        userRole,
        isAuthenticated: true,
        isLoading: false,
        requiresPasswordChange: false,
        passwordChangeSession: null,
        passwordChangePoolType: null,
      });

      return { requiresPasswordChange: false, userRole };
    } catch (error: any) {
      set({ isLoading: false });
      // Provide user-friendly error messages
      if (error.name === 'NotAuthorizedException' || error.message?.includes('Incorrect username or password')) {
        throw new Error('Invalid email or password');
      }
      throw error;
    }
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
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out from Amplify:', error);
    }

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

  checkAuth: async () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    try {
      // Check if user is signed in with Amplify
      const session = await fetchAuthSession();
      
      if (session.tokens?.accessToken) {
        const user = await getCurrentUser();
        const idToken = session.tokens.idToken?.toString();
        const accessToken = session.tokens.accessToken.toString();
        const payload = idToken ? decodeJWT(idToken) : null;

        // Extract user role from token
        let userRole: UserRole | null = null;
        if (payload) {
          if (payload['custom:role']) {
            const role = payload['custom:role'].toUpperCase();
            if (role === 'ADMIN') userRole = UserRole.ADMIN;
            else if (role === 'OWNER') userRole = UserRole.OWNER;
            else if (role === 'STAFF') userRole = UserRole.STAFF;
          }
          
          if (!userRole && payload['cognito:groups'] && Array.isArray(payload['cognito:groups'])) {
            if (payload['cognito:groups'].some((group: string) => group.toLowerCase().includes('admin'))) {
              userRole = UserRole.ADMIN;
            }
          }
        }

        // Default to OWNER if role cannot be determined
        if (!userRole) {
          userRole = UserRole.OWNER;
        }

        const email = payload?.email || localStorage.getItem('email') || '';

        // Store email and role in localStorage for quick access
        if (email) localStorage.setItem('email', email);
        if (userRole) localStorage.setItem('user_role', userRole);

        // Try to fetch company info
        let company = null;
        try {
          company = await apiClient.getMyCompany();
        } catch (error) {
          console.warn('Failed to fetch company info on auth check:', error);
        }

        set({
          accessToken,
          idToken: idToken || null,
          refreshToken: null, // Refresh tokens are handled internally by Amplify
          email,
          userRole,
          company,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      // User is not authenticated
      console.debug('Auth check failed:', error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
