import crypto from "node:crypto";

/**
 * Lightweight HMAC-based file-access tokens.
 *
 * Uses a random-per-restart secret by default — tokens expire on server
 * restart, which is acceptable for a local/internal tool.
 * Set FILE_ACCESS_SECRET env var for persistence across restarts.
 */
const SECRET =
  process.env.FILE_ACCESS_SECRET ??
  crypto.randomBytes(32).toString("hex");

const TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Sign a file path → returns "timestamp.signature" */
export function signFileAccess(filePath: string): string {
  const ts = Date.now().toString(36);
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(`${filePath}\n${ts}`)
    .digest("base64url");
  return `${ts}.${sig}`;
}

/** Verify a token for a given file path. Throws on invalid/expired. */
export function verifyFileAccess(filePath: string, token: string): void {
  const dotIdx = token.indexOf(".");
  if (dotIdx < 1) throw new Error("Malformed token");

  const ts = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(`${filePath}\n${ts}`)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("Invalid signature");
  }

  const issuedAt = parseInt(ts, 36);
  if (Date.now() - issuedAt > TTL_MS) {
    throw new Error("Token expired");
  }
}
