import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-config";

const NEST_API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.handycall.org/api/v1").trim();

// Public paths that don't require authentication (chicken-and-egg fix)
const PUBLIC_PATHS = [
  "auth/login",
  "auth/customer/register",
  "auth/pro/register",
  "auth/oauth/exchange",
  "auth/verify-email",
  "auth/resend-confirmation",
  "auth/refresh",
  "auth/change-password", // Allow password changes without auth
  "auth/forgot-password",
  "auth/reset-password",
  // Marketplace is public — consumers browse without an account
  "marketplace/search",
  "marketplace/services",
  "marketplace/filters",
  "pros/",
  "reviews/pro/",
];

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(req, params, 'GET');
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(req, params, 'POST');
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(req, params, 'PUT');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(req, params, 'PATCH');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(req, params, 'DELETE');
}

async function handleRequest(
  req: NextRequest,
  params: { path: string[] },
  method: string
) {
  // Reconstruct the path early to check if it's public
  const path = params.path.join("/");

  // Check if this is a public path that doesn't require authentication
  const isPublicPath = PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath));
  
  // Get session (will be null for unauthenticated users)
  const session = await getServerSession(authOptions);

  // 1. Check if user is authenticated (SKIP check if path is public)
  // This fixes the "chicken and egg" problem - users need to login before having a session
  const bearerToken = (session as any)?.idToken || (session as any)?.accessToken;
  
  // For non-public paths, require both session and bearer token
  if (!isPublicPath && (!session || !bearerToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Construct the full backend URL
  const url = `${NEST_API_URL}/${path}${req.nextUrl.search}`;

  // 3. Get request body if applicable
  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      const rawBody = await req.arrayBuffer();
      if (rawBody.byteLength > 0) {
        body = rawBody;
      }
    } catch {
      // No body, that's fine
    }
  }

  // 4. Forward request to NestJS
  try {
    // Build headers conditionally - only add Authorization if we have a session
    const headers = new Headers();
    const contentType = req.headers.get("content-type");
    const accept = req.headers.get("accept");
    const requestId = req.headers.get("x-request-id");

    if (contentType) {
      headers.set("Content-Type", contentType);
    } else if (body) {
      headers.set("Content-Type", "application/json");
    }

    if (accept) {
      headers.set("Accept", accept);
    }
    if (requestId) {
      headers.set("X-Request-Id", requestId);
    }

    const companyOverride = req.headers.get('x-company-id');
    const isAdminSession =
      (session as any)?.poolType === 'admin' || (session as any)?.userRole === 'ADMIN';
    if (companyOverride && isAdminSession) {
      headers.set('x-company-id', companyOverride);
    }
    
    // Only add Authorization header if we have a session (not needed for public paths)
    if (bearerToken) {
      headers.set("Authorization", `Bearer ${bearerToken}`); // Use Cognito token (id or access) for backend auth
    }
    
    const response = await fetch(url, {
      method: method,
      headers,
      body: body,
      cache: 'no-store',
    });

    // 5. Parse and return NestJS response to the frontend
    const responseContentType = response.headers.get('content-type') || '';
    const raw = await response.text();

    // Try JSON first when content-type suggests it, otherwise fall back to raw text.
    if (responseContentType.includes('application/json')) {
      try {
        const data = raw ? JSON.parse(raw) : null;
        return NextResponse.json(data, { status: response.status });
      } catch (e: any) {
        return NextResponse.json(
          {
            error: 'Upstream returned invalid JSON',
            upstreamStatus: response.status,
            message: e?.message || 'Failed to parse JSON',
            raw: raw?.slice(0, 2000) || '',
          },
          { status: 502 },
        );
      }
    }

    // Non-JSON response; return as JSON wrapper so the frontend can show it.
    return NextResponse.json(
      {
        raw: raw?.slice(0, 2000) || '',
      },
      { status: response.status },
    );
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
