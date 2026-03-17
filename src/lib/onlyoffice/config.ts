import jwt from "jsonwebtoken";

/** URL of the OnlyOffice Document Server (Docker container). */
export const ONLYOFFICE_URL = process.env.ONLYOFFICE_URL || "http://localhost:8080";

/** Shared secret for JWT between Next.js and OnlyOffice (lazy — only throws when actually used). */
export function getJwtSecret(): string {
  const secret = process.env.ONLYOFFICE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "ONLYOFFICE_JWT_SECRET environment variable is required. " +
      "Set it in .env.local or your deployment environment.",
    );
  }
  return secret;
}

/** URL that OnlyOffice (inside Docker) uses to reach this Next.js app. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://host.docker.internal:3000";

/** Sign a payload as JWT for OnlyOffice communication. */
export function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, getJwtSecret(), { algorithm: "HS256", expiresIn: "1h" });
}

/** Verify a JWT token from OnlyOffice. Throws on invalid/expired. */
export function verifyToken(token: string): Record<string, unknown> {
  return jwt.verify(token, getJwtSecret()) as Record<string, unknown>;
}
