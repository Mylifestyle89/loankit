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

/** Roles used in this application */
export type AppRole = "admin" | "editor" | "viewer";

/** Validate session + require editor or admin role. Throws 403 if viewer. */
export async function requireEditorOrAdmin() {
  const session = await requireSession();
  const role = session.user.role as AppRole;
  if (role !== "admin" && role !== "editor") {
    throw new AuthError(403, "Forbidden: editor or admin access required");
  }
  return session;
}

/** Require admin (bypass) or that session user matches resourceOwnerId (editor). */
export async function requireOwnerOrAdmin(resourceOwnerId: string) {
  const session = await requireSession();
  if (session.user.role === "admin") return session;
  if (session.user.role === "editor" && session.user.id === resourceOwnerId) return session;
  throw new AuthError(403, "Forbidden: you do not own this resource");
}

/** Convert AuthError to NextResponse. Returns null if not an AuthError. */
export function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
