import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Routes that don't require authentication */
const PUBLIC_PATHS = ["/", "/login", "/api/auth"];

/** Cron routes use their own secret-based auth */
const CRON_PATH = "/api/cron";

/** OnlyOffice callback is server-to-server (has its own JWT auth) */
const ONLYOFFICE_CALLBACK = "/api/onlyoffice/callback";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // Redirect authenticated users away from /login
    if (pathname === "/login") {
      const sessionCookie = getSessionCookie(request);
      if (sessionCookie) {
        return NextResponse.redirect(new URL("/report/mapping", request.url));
      }
    }
    return NextResponse.next();
  }

  // Skip cron routes (secret-based auth) and OnlyOffice callback (JWT auth)
  if (pathname.startsWith(CRON_PATH) || pathname.startsWith(ONLYOFFICE_CALLBACK)) {
    return NextResponse.next();
  }

  // Check session cookie (fast, no DB call)
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    // API routes: return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Pages: redirect to login with callback URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static assets
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
