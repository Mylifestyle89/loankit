import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;

  if (!sessionToken) {
    // No session cookie → redirect to login with callback
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only match page routes — exclude all internal Next.js paths, API routes, and static files
  matcher: ["/((?!_next|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
