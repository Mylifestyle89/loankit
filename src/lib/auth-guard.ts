import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "./auth";

/** Custom error for auth failures */
export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Validate session from request headers. Returns session + user or throws 401. */
export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    throw new AuthError(401, "Unauthorized");
  }
  return session;
}

/** Validate session + require admin role. Throws 403 if not admin. */
export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    throw new AuthError(403, "Forbidden: admin access required");
  }
  return session;
}

/** Convert AuthError to NextResponse. Returns null if not an AuthError. */
export function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
