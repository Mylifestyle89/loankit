import crypto from "node:crypto";

/**
 * HMAC-based file-access tokens bound to the issuing session.
 *
 * Production requires FILE_ACCESS_SECRET — failing fast at module load
 * prevents a silent random-per-cold-start fallback invalidating tokens
 * across Vercel instances. Dev keeps the random fallback for convenience.
 *
 * Tokens bind to a sessionId so a token minted for user A cannot be
 * replayed by user B.
 */
function resolveSecret(): string {
  const envSecret = process.env.FILE_ACCESS_SECRET;
  if (envSecret) return envSecret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FILE_ACCESS_SECRET is required in production");
  }
  return crypto.randomBytes(32).toString("hex");
}

const SECRET = resolveSecret();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function buildPayload(filePath: string, ts: string, sessionId: string): string {
  return `${filePath}\n${ts}\n${sessionId}`;
}

/** Sign a file path for a specific session → returns "timestamp.signature" */
export function signFileAccess(filePath: string, sessionId: string): string {
  const ts = Date.now().toString(36);
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(buildPayload(filePath, ts, sessionId))
    .digest("base64url");
  return `${ts}.${sig}`;
}

/** Verify a token for a given file path + session. Throws on invalid/expired. */
export function verifyFileAccess(filePath: string, token: string, sessionId: string): void {
  const dotIdx = token.indexOf(".");
  if (dotIdx < 1) throw new Error("Malformed token");

  const ts = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(buildPayload(filePath, ts, sessionId))
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid signature");
  }

  const issuedAt = parseInt(ts, 36);
  if (Date.now() - issuedAt > TTL_MS) {
    throw new Error("Token expired");
  }
}
