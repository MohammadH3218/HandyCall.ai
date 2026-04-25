import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import CognitoProvider from 'next-auth/providers/cognito';
import { decodeJWT } from '@/lib/jwt';
import type { JWT } from 'next-auth/jwt';
import type { UserRole } from '@/lib/shared';

const AUTH_USER_ROLE = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  STAFF: 'STAFF',
} as const satisfies Record<string, UserRole>;

function normalizeEnv(value?: string | null) {
  return value?.trim();
}

const API_URL = normalizeEnv(process.env.NEXT_PUBLIC_API_URL) ?? 'https://api.handycall.org/api/v1';
const COGNITO_REGION =
  normalizeEnv(process.env.COGNITO_REGION) ??
  normalizeEnv(process.env.AWS_COGNITO_REGION) ??
  normalizeEnv(process.env.NEXT_PUBLIC_COGNITO_REGION) ??
  'us-east-1';
const COGNITO_USER_POOL_ID =
  normalizeEnv(process.env.COGNITO_USER_POOL_ID) ??
  normalizeEnv(process.env.AWS_COGNITO_USERS_POOL_ID) ??
  normalizeEnv(process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID) ??
  'us-east-1_gBsGtRPnM';
const COGNITO_ISSUER =
  normalizeEnv(process.env.COGNITO_ISSUER) ??
  (COGNITO_REGION && COGNITO_USER_POOL_ID
    ? `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`
    : undefined);
const COGNITO_CLIENT_ID =
  normalizeEnv(process.env.COGNITO_CLIENT_ID) ??
  normalizeEnv(process.env.AWS_COGNITO_USERS_CLIENT_ID) ??
  normalizeEnv(process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) ??
  '3vhh0artoakoardoi4e9rdm3m9';
const COGNITO_CLIENT_SECRET =
  normalizeEnv(process.env.COGNITO_CLIENT_SECRET) ??
  normalizeEnv(process.env.AWS_COGNITO_USERS_CLIENT_SECRET) ??
  '';
const HAS_COGNITO_CLIENT_SECRET = Boolean(COGNITO_CLIENT_SECRET.trim());
const COGNITO_GOOGLE_IDP = normalizeEnv(process.env.COGNITO_GOOGLE_IDP) ?? 'Google';
const COGNITO_APPLE_IDP = normalizeEnv(process.env.COGNITO_APPLE_IDP) ?? 'SignInWithApple';
const COGNITO_AUTH_DOMAIN =
  normalizeEnv(process.env.COGNITO_AUTH_DOMAIN) ??
  normalizeEnv(process.env.NEXT_PUBLIC_COGNITO_AUTH_DOMAIN) ??
  normalizeEnv(process.env.COGNITO_DOMAIN) ??
  normalizeEnv(process.env.NEXT_PUBLIC_COGNITO_DOMAIN) ??
  'handycall';
const COGNITO_AUTH_BASE_URL = COGNITO_AUTH_DOMAIN
  ? COGNITO_AUTH_DOMAIN.startsWith('http')
    ? COGNITO_AUTH_DOMAIN
    : `https://${COGNITO_AUTH_DOMAIN}.auth.${COGNITO_REGION}.amazoncognito.com`
  : undefined;

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

function unwrapApiResponse<T extends Record<string, any>>(payload: any): T {
  if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
    return payload.data as T;
  }

  return (payload || {}) as T;
}

function getTokenExpiryMs(token?: string) {
  if (!token) return null;
  const decoded = decodeJWT(token);
  const exp = decoded?.exp;
  if (!exp) return null;
  return exp * 1000;
}

function poolTypeToUserType(poolType?: string): 'CUSTOMER' | 'PRO' | 'ADMIN' {
  if (poolType === 'customer') return 'CUSTOMER';
  if (poolType === 'admin') return 'ADMIN';
  return 'PRO';
}

async function refreshAppTokens(token: JWT): Promise<JWT> {
  const refreshToken = token.refreshToken as string | undefined;
  if (!refreshToken) {
    return {
      ...token,
      accessToken: undefined,
      idToken: undefined,
      error: 'RefreshAccessTokenError',
    };
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      return {
        ...token,
        idToken: undefined,
        error: 'RefreshAccessTokenError',
      };
    }

    const rawData = await response.json();
    const data = unwrapApiResponse<Record<string, any>>(rawData);
    const accessToken = data.access_token || data.accessToken || data.id_token || data.idToken;
    const nextRefreshToken = data.refresh_token || data.refreshToken || refreshToken;

    return {
      ...token,
      accessToken: accessToken || token.accessToken,
      idToken: accessToken || token.idToken,
      refreshToken: nextRefreshToken,
      error: undefined,
    };
  } catch {
    return {
      ...token,
      accessToken: undefined,
      idToken: undefined,
      error: 'RefreshAccessTokenError',
    };
  }
}

const buildCognitoProvider = (options: { id: string; name: string; identityProvider: string }) =>
  CognitoProvider({
    id: options.id,
    name: options.name,
    clientId: COGNITO_CLIENT_ID,
    ...(HAS_COGNITO_CLIENT_SECRET ? { clientSecret: COGNITO_CLIENT_SECRET } : {}),
    issuer: COGNITO_ISSUER,
    // Cognito social sign-in returns an ID token with a nonce claim, so we
    // must validate nonce in addition to PKCE. We intentionally avoid state
    // here because the Google account chooser flow was breaking state cookies.
    checks: ['pkce', 'nonce'],
    ...(HAS_COGNITO_CLIENT_SECRET
      ? {}
      : {
          client: {
            token_endpoint_auth_method: 'none',
          },
        }),
    ...(COGNITO_AUTH_BASE_URL
      ? {
          authorization: {
            url: `${COGNITO_AUTH_BASE_URL}/oauth2/authorize`,
            params: {
              identity_provider: options.identityProvider,
              response_type: 'code',
              scope: 'openid email profile',
            },
          },
          token: `${COGNITO_AUTH_BASE_URL}/oauth2/token`,
          userinfo: `${COGNITO_AUTH_BASE_URL}/oauth2/userInfo`,
        }
      : {
          authorization: {
            params: {
              identity_provider: options.identityProvider,
              response_type: 'code',
              scope: 'openid email profile',
            },
          },
        }),
  });

export const authOptions: NextAuthOptions = {
  providers: [
    ...(COGNITO_ISSUER && COGNITO_CLIENT_ID
      ? [
          buildCognitoProvider({
            id: 'cognito-google',
            name: 'Google',
            identityProvider: COGNITO_GOOGLE_IDP,
          }),
          buildCognitoProvider({
            id: 'cognito-apple',
            name: 'Apple',
            identityProvider: COGNITO_APPLE_IDP,
          }),
          // Customer-specific OAuth providers — set poolType='customer' in JWT callback
          buildCognitoProvider({
            id: 'cognito-google-customer',
            name: 'Google',
            identityProvider: COGNITO_GOOGLE_IDP,
          }),
          buildCognitoProvider({
            id: 'cognito-apple-customer',
            name: 'Apple',
            identityProvider: COGNITO_APPLE_IDP,
          }),
        ]
      : []),
    CredentialsProvider({
      id: 'email-verification',
      name: 'Email verification',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        const verificationToken = (credentials?.token || '').trim();
        if (!verificationToken) {
          throw new Error('Verification token is required');
        }

        const response = await fetch(
          `${API_URL}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`,
          { method: 'GET' }
        );

        const rawData = await response.json().catch(() => ({}));
        const data = unwrapApiResponse<Record<string, any>>(rawData);
        if (!response.ok) {
          const message =
            data?.message ||
            rawData?.message ||
            data?.error?.message ||
            rawData?.error?.message ||
            data?.error ||
            rawData?.error ||
            'Verification failed';
          throw new Error(message);
        }

        const accessToken = data.access_token || data.accessToken || data.id_token || data.idToken;
        if (!accessToken) {
          throw new Error('Verification completed but no session token was returned');
        }

        const refreshToken = data.refresh_token || data.refreshToken;
        const userPayload = data.user || {};
        const decoded = accessToken ? decodeJWT(accessToken) : null;
        const poolType = data.user_type === 'CUSTOMER' ? 'customer' : 'users';
        const givenName =
          (userPayload.first_name as string | undefined) ||
          (decoded?.given_name as string | undefined);
        const familyName =
          (userPayload.last_name as string | undefined) ||
          (decoded?.family_name as string | undefined);
        const name =
          (decoded?.name as string | undefined) ||
          [givenName, familyName].filter(Boolean).join(' ') ||
          undefined;
        const userId =
          (userPayload.customer_id as string | undefined) ||
          (userPayload.pro_id as string | undefined) ||
          (decoded?.sub as string | undefined) ||
          verificationToken;
        const email =
          (userPayload.email as string | undefined) || (decoded?.email as string | undefined);

        return {
          id: userId,
          email,
          accessToken,
          idToken: accessToken,
          refreshToken,
          userRole: AUTH_USER_ROLE.OWNER,
          poolType,
          name,
          given_name: givenName,
          family_name: familyName,
        };
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        pool_type: { label: 'Pool', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Use backend's login endpoint which handles Cognito authentication
          // This avoids needing client secret in Next.js and reuses existing backend logic
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              user_type: poolTypeToUserType((credentials as any).pool_type || 'users'),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage =
              errorData.error?.message || errorData.message || 'Authentication failed';
            throw new Error(errorMessage);
          }

          const rawData = await response.json();
          const data = unwrapApiResponse<Record<string, any>>(rawData);

          if (data?.requiresPasswordChange && data?.session) {
            const payload = {
              code: 'NEW_PASSWORD_REQUIRED',
              session: data.session,
              poolType: data.poolType || data.pool_type || 'users',
              email: credentials.email,
              userRole: data.userRole,
            };
            const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
            throw new Error(`NEW_PASSWORD_REQUIRED:${encoded}`);
          }

          // Backend returns Cognito tokens via loginWithCognito
          // Extract tokens from response
          const accessToken =
            data.access_token || data.accessToken || data.id_token || data.idToken;
          const userPayload = data.user || {};
          const nameFromResponse =
            (data.name as string | undefined) ||
            (data.fullName as string | undefined) ||
            (userPayload.name as string | undefined);
          const givenNameFromResponse =
            (data.first_name as string | undefined) ||
            (data.given_name as string | undefined) ||
            (userPayload.first_name as string | undefined) ||
            (userPayload.given_name as string | undefined);
          const familyNameFromResponse =
            (data.last_name as string | undefined) ||
            (data.family_name as string | undefined) ||
            (userPayload.last_name as string | undefined) ||
            (userPayload.family_name as string | undefined);
          const poolTypeFromResponse =
            (data.user_type as string | undefined) === 'CUSTOMER'
              ? 'customer'
              : (data.poolType as string | undefined) ||
                (data.pool_type as string | undefined) ||
                (data.isAdmin ? 'admin' : undefined);
          const isAdminUser =
            poolTypeFromResponse === 'admin' ||
            data.isAdmin === true ||
            (data.userRole as UserRole | undefined) === AUTH_USER_ROLE.ADMIN;
          const resolvedUserRole =
            (data.userRole as UserRole | undefined) ||
            (isAdminUser ? AUTH_USER_ROLE.ADMIN : AUTH_USER_ROLE.OWNER);
          const poolType =
            poolTypeFromResponse === 'admin' || resolvedUserRole === AUTH_USER_ROLE.ADMIN
              ? 'admin'
              : poolTypeFromResponse === 'customer'
                ? 'customer'
                : 'users';
          const decoded = accessToken ? decodeJWT(accessToken) : null;
          const resolvedName =
            nameFromResponse ||
            decoded?.name ||
            [
              givenNameFromResponse || decoded?.given_name,
              familyNameFromResponse || decoded?.family_name,
            ]
              .filter(Boolean)
              .join(' ') ||
            undefined;
          const resolvedGivenName =
            givenNameFromResponse || (decoded?.given_name as string | undefined);
          const resolvedFamilyName =
            familyNameFromResponse || (decoded?.family_name as string | undefined);

          if (!accessToken) {
            throw new Error('Invalid response from authentication server');
          }

          const refreshToken = data.refresh_token || data.refreshToken;
          const decodedUserToken = accessToken ? decodeJWT(accessToken) : null;
          const resolvedUserId =
            (decodedUserToken?.sub as string | undefined) ||
            (data.user?.customer_id as string | undefined) ||
            (data.user?.pro_id as string | undefined) ||
            (data.user_id as string | undefined) ||
            credentials.email;

          // Return user info and tokens for NextAuth to store
          return {
            id: resolvedUserId,
            email: credentials.email,
            accessToken: accessToken,
            idToken: accessToken,
            refreshToken: refreshToken,
            userRole: resolvedUserRole,
            poolType: poolType,
            name: resolvedName,
            given_name: resolvedGivenName,
            family_name: resolvedFamilyName,
          };
        } catch (error: any) {
          // Return user-friendly error messages
          if (error.message) {
            throw error;
          }
          throw new Error('Authentication failed. Please check your credentials.');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.type === 'oauth') {
        const oauthIdToken = (account as any).id_token as string | undefined;
        const decoded = oauthIdToken ? decodeJWT(oauthIdToken) : null;
        const isCustomerOAuth = account.provider.endsWith('-customer');
        const email =
          (decoded?.email as string | undefined) ||
          ((profile as any)?.email as string | undefined) ||
          (token.email as string | undefined);
        const name =
          (decoded?.name as string | undefined) ||
          ((profile as any)?.name as string | undefined) ||
          undefined;
        const givenName =
          (decoded?.given_name as string | undefined) ||
          ((profile as any)?.given_name as string | undefined) ||
          undefined;
        const familyName =
          (decoded?.family_name as string | undefined) ||
          ((profile as any)?.family_name as string | undefined) ||
          undefined;

        if (!email) {
          token.error = 'OAuthEmailMissing';
          return token;
        }

        const exchangeResponse = await fetch(`${API_URL}/auth/oauth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            user_type: isCustomerOAuth ? 'CUSTOMER' : 'PRO',
            provider: account.provider,
            name,
            given_name: givenName,
            family_name: familyName,
          }),
        });

        if (!exchangeResponse.ok) {
          token.error = 'OAuthExchangeFailed';
          return token;
        }

        const rawData = await exchangeResponse.json();
        const data = unwrapApiResponse<Record<string, any>>(rawData);
        const accessToken = data.access_token || data.accessToken;
        const refreshToken = data.refresh_token || data.refreshToken;
        const resolvedPoolType = data.user_type === 'CUSTOMER' ? 'customer' : 'users';

        token.accessToken = accessToken;
        token.idToken = accessToken;
        token.refreshToken = refreshToken;
        token.sub =
          data.user?.customer_id ||
          data.user?.pro_id ||
          token.sub ||
          (decoded?.sub as string | undefined);
        token.email = email;
        token.userRole = AUTH_USER_ROLE.OWNER;
        token.poolType = resolvedPoolType;
        token.authProvider = 'oauth';
        token.name = name || token.name;
        token.given_name = givenName || token.given_name;
        token.family_name = familyName || token.family_name;
      }

      // Persist tokens from credentials provider without clobbering OAuth tokens
      if (user) {
        if ((user as any).accessToken) {
          token.accessToken = (user as any).accessToken ?? token.accessToken;
        }
        if ((user as any).idToken) {
          token.idToken = (user as any).idToken ?? token.idToken;
        }
        if ((user as any).refreshToken) {
          token.refreshToken = (user as any).refreshToken;
        }
        // Track that this session came from the credentials provider
        if (!token.authProvider) token.authProvider = 'credentials';
        token.sub = token.sub || user.id;
        token.email = token.email || user.email;
        token.userRole = token.userRole || (user as any).userRole;
        token.poolType = token.poolType || (user as any).poolType;
        token.name = token.name || (user as any).name;
        token.given_name = token.given_name || (user as any).given_name;
        token.family_name = token.family_name || (user as any).family_name;
      }

      if (!token.userRole && token.poolType === 'admin') {
        token.userRole = AUTH_USER_ROLE.ADMIN;
      } else if (!token.userRole) {
        token.userRole = AUTH_USER_ROLE.OWNER;
      }

      if (!token.poolType) {
        token.poolType = token.userRole === AUTH_USER_ROLE.ADMIN ? 'admin' : 'users';
      }

      const expiryMs = getTokenExpiryMs(
        (token.accessToken as string | undefined) || (token.idToken as string | undefined)
      );
      if (expiryMs && Date.now() > expiryMs - TOKEN_REFRESH_BUFFER_MS) {
        token = await refreshAppTokens(token);
      }

      return token;
    },
    async session({ session, token }) {
      // Store tokens and role in session for server-side proxy to use
      if (token) {
        (session as any).accessToken = token.accessToken as string;
        (session as any).idToken = (token.idToken as string) || (token.accessToken as string);
        (session as any).refreshToken = token.refreshToken as string;
        const email = (token.email as string | undefined) || session.user?.email;
        const derivedRole =
          (token.userRole as UserRole | undefined) ||
          (token.poolType === 'admin' ? AUTH_USER_ROLE.ADMIN : AUTH_USER_ROLE.OWNER);
        const poolType =
          (token.poolType as string | undefined) ||
          (derivedRole === AUTH_USER_ROLE.ADMIN ? 'admin' : 'users');
        const name =
          (token.name as string | undefined) ||
          [token.given_name, token.family_name].filter(Boolean).join(' ') ||
          session.user?.name ||
          undefined;

        session.user = {
          ...(session.user || {}),
          id: (token.sub as string | undefined) || (session.user as any)?.id,
          email,
          name: name || email || undefined,
        };

        (session.user as any).given_name = token.given_name as string | undefined;
        (session.user as any).family_name = token.family_name as string | undefined;
        (session.user as any).role = derivedRole;
        (session as any).userRole = derivedRole;
        (session as any).poolType = poolType;
        (session as any).authProvider = token.authProvider || 'credentials';
        (session as any).error = token.error;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 60 * 10,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  // Set the base URL for NextAuth callbacks
  useSecureCookies: process.env.NODE_ENV === 'production',
  debug: process.env.NEXTAUTH_DEBUG === 'true',
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warning]', code);
    },
  },
};
