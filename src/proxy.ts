import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { DEFAULT_CALLBACK } from "@/lib/auth-utils";

/** Cron routes use their own secret-based auth */
const CRON_PATH = "/api/cron";

/** OnlyOffice callback is server-to-server (has its own JWT auth) */
const ONLYOFFICE_CALLBACK = "/api/onlyoffice/callback";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  // Skip cron routes (secret-based auth) and OnlyOffice callback (JWT auth)
  if (pathname.startsWith(CRON_PATH) || pathname.startsWith(ONLYOFFICE_CALLBACK)) {
    return NextResponse.next();
  }

  // Allow API auth directly
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // If logged in and hitting root or login pages -> redirect to default dashboard
  if (sessionCookie && (pathname === "/" || pathname.startsWith("/login"))) {
    return NextResponse.redirect(new URL(DEFAULT_CALLBACK, request.url));
  }

  // Allow all login pages (login, verify-2fa, etc.) when no session cookie
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Check session cookie (fast, no DB call)
  if (!sessionCookie) {
    // API routes: return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Pages: redirect to login with callback URL
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
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
