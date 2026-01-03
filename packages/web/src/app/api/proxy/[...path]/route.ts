import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-config";

const NEST_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.handycall.org/api/v1";

// Public paths that don't require authentication (chicken-and-egg fix)
const PUBLIC_PATHS = [
  "auth/login",
  "auth/register",
  "auth/refresh",
  "auth/change-password", // Allow password changes without auth
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
  if (!isPublicPath && (!session || !session.idToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Construct the full backend URL
  const url = `${NEST_API_URL}/${path}${req.nextUrl.search}`;

  // 3. Get request body if applicable
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD" && method !== "DELETE") {
    try {
      body = await req.text();
    } catch (error) {
      // No body, that's fine
    }
  }

  // 4. Forward request to NestJS
  try {
    // Build headers conditionally - only add Authorization if we have a session
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Only add Authorization header if we have a session (not needed for public paths)
    if (session && session.idToken) {
      headers["Authorization"] = `Bearer ${session.idToken}`; // Use ID token for backend user lookup
    }
    
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: body,
    });

    // 5. Parse and return NestJS response to the frontend
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

