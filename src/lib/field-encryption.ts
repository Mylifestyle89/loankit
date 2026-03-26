/**
 * AES-256-GCM field-level encryption for PII data (CIF, phone, CCCD).
 * Encrypted values stored as: "enc:<iv-b64>:<authTag-b64>:<ciphertext-b64>"
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { maskMiddle } from "@/services/security.service";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:";

/** Resolve 32-byte encryption key from env */
function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  return Buffer.from(hex, "hex");
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
  cif: { keepStart: 0, keepEnd: 4 },   // ****1234
  phone: { keepStart: 3, keepEnd: 3 }, // 091****678
  cccd: { keepStart: 2, keepEnd: 3 },  // 07****234
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

/** PII fields on Customer that need encryption */
const PII_CUSTOMER_FIELDS = ["customer_code", "phone", "cccd", "spouse_cccd"] as const;

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

/** Decrypt all PII fields in a customer data object (after DB read) */
export function decryptCustomerPii<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const field of PII_CUSTOMER_FIELDS) {
    const val = result[field];
    if (typeof val === "string" && isEncrypted(val)) {
      (result as Record<string, unknown>)[field] = decryptField(val);
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
