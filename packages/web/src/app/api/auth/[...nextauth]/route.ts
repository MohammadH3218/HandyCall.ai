import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-config";

// Guarantee NextAuth always sees the correct production URL so the redirect_uri
// it sends to Cognito is always https://handycall.org — NOT a Vercel preview URL.
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = "https://handycall.org";
}

const nextAuthHandler = NextAuth(authOptions);

// Wrap the handler to log any raw OAuth errors from Cognito/Google before
// NextAuth converts them to the generic OAuthCallback error code.
async function handler(req: NextRequest, ctx: any) {
  const pathname = req.nextUrl.pathname;
  if (pathname.includes("/callback/")) {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    if (params.error) {
      console.error("[OAuth Callback] Provider error:", {
        error: params.error,
        error_description: params.error_description,
        provider: pathname.split("/callback/")[1],
      });
    }
  }
  return (nextAuthHandler as any)(req, ctx);
}

export { handler as GET, handler as POST };

