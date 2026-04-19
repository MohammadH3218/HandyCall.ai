import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-config";

// Guarantee NextAuth always sees the correct production URL so the redirect_uri
// it sends to Cognito is always https://handycall.org — NOT a Vercel preview URL.
// On Vercel cold starts without NEXTAUTH_URL set, NextAuth auto-detects from the
// request host which can be a .vercel.app subdomain, causing redirect_uri mismatch
// and the OAuthCallback error on first Google sign-in attempts.
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = "https://handycall.org";
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

