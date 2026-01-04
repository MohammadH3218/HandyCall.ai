import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRole } from "@handycall/shared";

// Prefer injected env, but fall back to production defaults; avoid mutating env to keep
// the bundle side-effect free.
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "https://handycall.org";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.handycall.org/api/v1";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          // Use backend's login endpoint which handles Cognito authentication
          // This avoids needing client secret in Next.js and reuses existing backend logic
          const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || errorData.message || "Authentication failed";
            throw new Error(errorMessage);
          }

          const data = await response.json();
          
          // Backend returns Cognito tokens via loginWithCognito
          // Extract tokens from response
          const idToken = data.id_token || data.idToken;
          const accessToken = data.access_token || data.accessToken;
          const refreshToken = data.refresh_token || data.refreshToken;
          const userRole = (data.userRole as UserRole | undefined) || undefined;
          const poolType = (data.poolType as string | undefined) || undefined;

          if (!idToken || !accessToken) {
            throw new Error("Invalid response from authentication server");
          }

          // Return user info and tokens for NextAuth to store
          return {
            id: credentials.email,
            email: credentials.email,
            accessToken: accessToken,
            idToken: idToken,
            refreshToken: refreshToken,
            userRole: userRole ?? UserRole.OWNER,
            poolType: poolType,
          };
        } catch (error: any) {
          console.error("Auth error:", error);
          // Return user-friendly error messages
          if (error.message) {
            throw error;
          }
          throw new Error("Authentication failed. Please check your credentials.");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist tokens from credentials provider
      if (user) {
        console.log('[NextAuth JWT] User object received:', {
          hasAccessToken: !!(user as any).accessToken,
          hasIdToken: !!(user as any).idToken,
          hasRefreshToken: !!(user as any).refreshToken,
          userRole: (user as any).userRole,
        });
        token.accessToken = (user as any).accessToken;
        token.idToken = (user as any).idToken;
        token.refreshToken = (user as any).refreshToken;
        token.sub = user.id;
        token.email = user.email;
        token.userRole = (user as any).userRole;
        token.poolType = (user as any).poolType;
      }

      return token;
    },
    async session({ session, token }) {
      // Store tokens and role in session for server-side proxy to use
      console.log('[NextAuth Session] Token object:', {
        hasAccessToken: !!token.accessToken,
        hasIdToken: !!token.idToken,
        hasRefreshToken: !!token.refreshToken,
        userRole: token.userRole,
      });
      if (token) {
        (session as any).accessToken = token.accessToken as string;
        (session as any).idToken = token.idToken as string;
        (session as any).refreshToken = token.refreshToken as string;
        if (session.user) {
          session.user.id = token.sub as string;
          // Extend the user object with role for client-side checks
          (session.user as any).role = (token.userRole as string) ?? UserRole.OWNER;
        }
        (session as any).userRole = token.userRole ?? UserRole.OWNER;
        (session as any).poolType = token.poolType;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
  pages: {
    signIn: '/login',
  },
  // Set the base URL for NextAuth callbacks
  useSecureCookies: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
};

