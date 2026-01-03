import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-config";

const NEST_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.handycall.org/api/v1";

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
  const session = await getServerSession(authOptions);

  // 1. Check if user is authenticated via NextAuth cookie
  if (!session || !session.idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Reconstruct the path (e.g., /companies/me)
  const path = params.path.join("/");
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

  // 4. Forward request to NestJS with the secure ID token
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.idToken}`, // Use ID token for backend user lookup
      },
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

