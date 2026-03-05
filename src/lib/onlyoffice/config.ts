import jwt from "jsonwebtoken";

/** URL of the OnlyOffice Document Server (Docker container). */
export const ONLYOFFICE_URL = process.env.ONLYOFFICE_URL || "http://localhost:8080";

/** Shared secret for JWT between Next.js and OnlyOffice. */
const envSecret = process.env.ONLYOFFICE_JWT_SECRET;
if (!envSecret) {
  throw new Error(
    "ONLYOFFICE_JWT_SECRET environment variable is required. " +
    "Set it in .env.local or your deployment environment.",
  );
}
export const JWT_SECRET: string = envSecret;

/** URL that OnlyOffice (inside Docker) uses to reach this Next.js app. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://host.docker.internal:3000";

/** Sign a payload as JWT for OnlyOffice communication. */
export function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
}

/** Verify a JWT token from OnlyOffice. Throws on invalid/expired. */
export function verifyToken(token: string): Record<string, unknown> {
  return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
}
