import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Area", charset="UTF-8"'
    }
  });
}

export function middleware(request: NextRequest) {
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD が未設定です" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const base64 = authHeader.split(" ")[1];
    const decoded = atob(base64);
    const [user, password] = decoded.split(":");

    if (user === adminUser && password === adminPassword) {
      return NextResponse.next();
    }

    return unauthorized();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: [
    "/admin/:path*",

    "/api/cards/:path*",
    "/api/shops/:path*",
    "/api/post-queue/:path*",
    "/api/upload-post-image/:path*",
    "/api/import-prices/:path*",
    "/api/buy-prices/:path*",

    "/api/x/sync-shop-posts",
    "/api/x/resolve-user"
  ]
};