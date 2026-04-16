/**
 * AES-256-GCM field-level encryption for PII data (CIF, phone, CCCD, ...).
 * Encrypted values stored as: "enc:<iv-b64>:<authTag-b64>:<ciphertext-b64>"
 *
 * Deterministic HMAC-SHA256 hashing is also provided for lookup columns
 * (e.g. customer_code_hash) so we can find records by plaintext CIF after
 * the stored value becomes a random-IV ciphertext.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

import { maskMiddle } from "@/services/security.service";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:";
const HMAC_VERSION = "hmac-v1";

/** Resolve 32-byte encryption key from env */
function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/** Derive a stable HMAC key from ENCRYPTION_KEY so we do not introduce a
 *  second env var. Changing HMAC_VERSION (or the source key) invalidates
 *  every stored hash — write a key-rotation script if this happens. */
let cachedHmacKey: Buffer | null = null;
function getHmacKey(): Buffer {
  if (cachedHmacKey) return cachedHmacKey;
  const source = Buffer.concat([getKey(), Buffer.from(HMAC_VERSION, "utf8")]);
  cachedHmacKey = createHash("sha256").update(source).digest();
  return cachedHmacKey;
}

/** Deterministic HMAC-SHA256 of a lookup value, returned as base64url.
 *  Same input always produces the same output → safe for unique indexes
 *  and `WHERE` lookups. Not reversible. */
export function hashLookupValue(plaintext: string): string {
  return createHmac("sha256", getHmacKey()).update(plaintext, "utf8").digest("base64url");
}

/** Hash a customer CIF for the customer_code_hash column. */
export function hashCustomerCode(plaintext: string): string {
  return hashLookupValue(plaintext);
}

// ── Core encrypt/decrypt ────────────────────────────────────────────

/** Encrypt plaintext → "enc:<iv>:<tag>:<data>" */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/** Check if value has encryption prefix */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Decrypt "enc:..." → plaintext. Passes through non-encrypted values. */
export function decryptField(encrypted: string): string {
  if (!encrypted.startsWith(PREFIX)) return encrypted;
  const parts = encrypted.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const [ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return decipher.update(Buffer.from(dataB64, "base64")) + decipher.final("utf8");
}

/** Safe decrypt: handles null/undefined, passes through plaintext */
export function decryptIfEncrypted(value: string | null | undefined): string | null {
  if (!value) return null;
  return isEncrypted(value) ? decryptField(value) : value;
}

// ── Masking ─────────────────────────────────────────────────────────

/** Mask config per PII type */
const MASK_CONFIG = {
  cif: { keepStart: 0, keepEnd: 4 },     // ****1234
  phone: { keepStart: 3, keepEnd: 3 },   // 091****678
  cccd: { keepStart: 2, keepEnd: 3 },    // 07****234
  account: { keepStart: 0, keepEnd: 4 }, // ****5678 (bank_account)
  email: { keepStart: 2, keepEnd: 4 },   // ab****.com (generic middle-mask, keeps domain tail)
  name: { keepStart: 1, keepEnd: 1 },    // N***A (spouse_name)
} as const;

export type PiiType = keyof typeof MASK_CONFIG;

/** Decrypt (if needed) then mask a PII field for display */
export function maskPiiField(
  value: string | null | undefined,
  type: PiiType,
): string | null {
  if (!value) return null;
  const raw = decryptIfEncrypted(value);
  if (!raw) return null;
  const { keepStart, keepEnd } = MASK_CONFIG[type];
  return maskMiddle(raw, keepStart, keepEnd);
}

// ── Batch encrypt/decrypt for Customer model ────────────────────────

/** PII fields on Customer that need encryption. Extended 2026-04-08
 *  to cover the full Agribank compliance surface. date_of_birth is
 *  intentionally excluded (year-only, not sensitive).
 *
 *  INVARIANT: every field here MUST also appear in `maskMap` inside
 *  `maskCustomerResponse` below — otherwise decrypt paths will leak
 *  plaintext PII in API responses. */
const PII_CUSTOMER_FIELDS = [
  "customer_code",
  "phone",
  "cccd",
  "spouse_cccd",
  "cccd_old",
  "bank_account",
  "spouse_name",
  "email",
] as const;

/** PII fields on CoBorrower that need encryption. birth_year excluded. */
const PII_COBORROWER_FIELDS = [
  "full_name",
  "id_number",
  "id_old",
  "phone",
  "current_address",
  "permanent_address",
] as const;

/** PII fields on RelatedPerson that need encryption. */
const PII_RELATED_PERSON_FIELDS = ["id_number", "address"] as const;

/** Encrypt all PII fields in a customer data object (before DB write) */
export function encryptCustomerPii<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const field of PII_CUSTOMER_FIELDS) {
    const val = result[field];
    if (typeof val === "string" && val && !isEncrypted(val)) {
      (result as Record<string, unknown>)[field] = encryptField(val);
    }
  }
  return result;
}

/** Decrypt all PII fields in a customer data object (after DB read).
 *  Decryption failures on individual fields (e.g. key rotation, corrupted
 *  ciphertext) are logged and the offending field is passed through as the
 *  raw encrypted value instead of throwing, so callers like export/stream
 *  do not die on a single bad row. */
export function decryptCustomerPii<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const field of PII_CUSTOMER_FIELDS) {
    const val = result[field];
    if (typeof val === "string" && isEncrypted(val)) {
      try {
        (result as Record<string, unknown>)[field] = decryptField(val);
      } catch (error) {
        const id = "id" in result ? result.id : "<unknown>";
        console.error(`[decryptCustomerPii] ${field} failed for customer ${id}:`, error instanceof Error ? error.message : error);
      }
    }
  }
  return result;
}

/** Shared per-field encrypt helper — used by CoBorrower/RelatedPerson so the
 *  loop body stays DRY across models. */
function encryptFieldsInPlace<T extends Record<string, unknown>>(data: T, fields: readonly string[]): T {
  const result = { ...data };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === "string" && val && !isEncrypted(val)) {
      (result as Record<string, unknown>)[field] = encryptField(val);
    }
  }
  return result;
}

/** Shared per-field decrypt helper. Tolerant of per-field failure: logs
 *  and leaves the field as its original (encrypted) value so export/read
 *  paths do not die on one bad row. */
function decryptFieldsInPlace<T extends Record<string, unknown>>(
  data: T,
  fields: readonly string[],
  modelLabel: string,
): T {
  const result = { ...data };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === "string" && isEncrypted(val)) {
      try {
        (result as Record<string, unknown>)[field] = decryptField(val);
      } catch (error) {
        const id = "id" in result ? result.id : "<unknown>";
        console.error(
          `[decrypt${modelLabel}Pii] ${field} failed for ${modelLabel} ${id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }
  return result;
}

/** Encrypt all PII fields on a CoBorrower row before DB write. */
export function encryptCoBorrowerPii<T extends Record<string, unknown>>(data: T): T {
  return encryptFieldsInPlace(data, PII_COBORROWER_FIELDS);
}

/** Decrypt all PII fields on a CoBorrower row after DB read. */
export function decryptCoBorrowerPii<T extends Record<string, unknown>>(data: T): T {
  return decryptFieldsInPlace(data, PII_COBORROWER_FIELDS, "CoBorrower");
}

/** Encrypt all PII fields on a RelatedPerson row before DB write. */
export function encryptRelatedPersonPii<T extends Record<string, unknown>>(data: T): T {
  return encryptFieldsInPlace(data, PII_RELATED_PERSON_FIELDS);
}

/** Decrypt all PII fields on a RelatedPerson row after DB read. */
export function decryptRelatedPersonPii<T extends Record<string, unknown>>(data: T): T {
  return decryptFieldsInPlace(data, PII_RELATED_PERSON_FIELDS, "RelatedPerson");
}

/** Encrypt _owners array in collateral properties_json (PII: cccd, phone, address). */
export function encryptCollateralOwners(props: Record<string, unknown>): Record<string, unknown> {
  const result = { ...props };
  if (Array.isArray(result._owners) && result._owners.length > 0) {
    result._owners = encryptField(JSON.stringify(result._owners));
  }
  return result;
}

/** Decrypt _owners in collateral properties_json after DB read. */
export function decryptCollateralOwners(props: Record<string, unknown>): Record<string, unknown> {
  const result = { ...props };
  if (typeof result._owners === "string" && isEncrypted(result._owners)) {
    try {
      result._owners = JSON.parse(decryptField(result._owners));
    } catch {
      console.warn("[field-encryption] Failed to decrypt _owners, resetting to []");
      result._owners = [];
    }
  }
  return result;
}

/** Mask PII fields in a customer object for API responses */
export function maskCustomerResponse<T extends Record<string, unknown>>(
  customer: T,
  revealFields?: Set<string>,
): T {
  const result = { ...customer };
  const maskMap: Record<string, PiiType> = {
    customer_code: "cif",
    phone: "phone",
    cccd: "cccd",
    spouse_cccd: "cccd",
    cccd_old: "cccd",
    bank_account: "account",
    spouse_name: "name",
    email: "email",
  };
  for (const [field, type] of Object.entries(maskMap)) {
    if (revealFields?.has(field) || revealFields?.has("all")) continue;
    const val = result[field];
    if (typeof val === "string" && val) {
      (result as Record<string, unknown>)[field] = maskPiiField(val, type);
    }
  }
  return result;
}
