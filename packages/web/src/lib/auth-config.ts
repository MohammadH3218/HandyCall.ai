import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";

const cognitoClient = new CognitoIdentityProviderClient({ 
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1' 
});

// Calculate secret hash for Cognito client with secret
function calculateSecretHash(username: string, clientId: string, clientSecret: string): string {
  const message = username + clientId;
  const hmac = createHmac('sha256', clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}

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
          const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
          const clientSecret = process.env.COGNITO_USERS_CLIENT_SECRET!;

          // Calculate secret hash for client with secret
          const secretHash = calculateSecretHash(credentials.email, clientId, clientSecret);

          // Authenticate with Cognito using USER_PASSWORD_AUTH flow
          const command = new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: clientId,
            AuthParameters: {
              USERNAME: credentials.email,
              PASSWORD: credentials.password,
              SECRET_HASH: secretHash,
            },
          });

          const response = await cognitoClient.send(command);

          if (response.AuthenticationResult) {
            // Return user info and tokens
            return {
              id: credentials.email,
              email: credentials.email,
              accessToken: response.AuthenticationResult.AccessToken!,
              idToken: response.AuthenticationResult.IdToken!,
              refreshToken: response.AuthenticationResult.RefreshToken,
            };
          }

          // Handle challenge (like NEW_PASSWORD_REQUIRED)
          if (response.ChallengeName) {
            throw new Error(`Challenge required: ${response.ChallengeName}`);
          }

          return null;
        } catch (error: any) {
          console.error("Cognito auth error:", error);
          // Return more user-friendly error messages
          if (error.name === 'NotAuthorizedException') {
            throw new Error("Invalid email or password");
          }
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist tokens from credentials provider
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.idToken = (user as any).idToken;
        token.refreshToken = (user as any).refreshToken;
        token.sub = user.id;
        token.email = user.email;
      }
      
      return token;
    },
    async session({ session, token }) {
      // Store tokens in session for server-side proxy to use
      // In a true BFF, tokens are NOT exposed to the client
      // They're only used server-side in the proxy route
      if (token) {
        (session as any).accessToken = token.accessToken as string;
        (session as any).idToken = token.idToken as string;
        (session as any).refreshToken = token.refreshToken as string;
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
  pages: {
    signIn: '/login',
  },
};

