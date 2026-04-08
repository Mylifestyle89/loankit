/** Shared env loader for script tooling — keeps every one-off script free
 *  of a dotenv dependency while avoiding five copies of the same parser. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Parse a .env-style file into a plain object. Strips surrounding quotes
 *  and ignores blank lines + `#` comments. Returns `{}` if the file is
 *  missing so callers can fall back to other sources. */
export function loadEnvFile(filePath: string): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return {};
  }
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[trimmed.slice(0, eq).trim()] = value;
  }
  return env;
}

/** Load .env.vercel.production from the repo root. */
export function loadProdEnv(): Record<string, string> {
  return loadEnvFile(resolve(process.cwd(), ".env.vercel.production"));
}

/** Load .env from the repo root. */
export function loadLocalEnv(): Record<string, string> {
  return loadEnvFile(resolve(process.cwd(), ".env"));
}

/** Resolve ENCRYPTION_KEY from (in priority order) process.env,
 *  .env.vercel.production, then .env. Sets it on process.env as a side
 *  effect so later imports of field-encryption see it. */
export function ensureEncryptionKey(): void {
  if (process.env.ENCRYPTION_KEY) return;
  const prod = loadProdEnv().ENCRYPTION_KEY;
  if (prod) {
    process.env.ENCRYPTION_KEY = prod;
    return;
  }
  const local = loadLocalEnv().ENCRYPTION_KEY;
  if (local) process.env.ENCRYPTION_KEY = local;
}
