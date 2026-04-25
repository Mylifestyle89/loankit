# Phase 1: Encryption Library

**Priority:** Critical | **Effort:** S | **Status:** Pending

## Overview

Create `src/lib/field-encryption.ts` — AES-256-GCM encrypt/decrypt + mask utilities.

## Context Links

- Reuse: `src/services/security.service.ts` → `maskMiddle()`

## Requirements

- `encryptField(plaintext: string): string` → returns `"enc:<iv>:<authTag>:<ciphertext>"` (base64)
- `decryptField(encrypted: string): string` → returns plaintext
- `isEncrypted(value: string): boolean` → checks `enc:` prefix
- `decryptIfEncrypted(value: string | null): string | null` → safe helper
- `maskPiiField(value: string | null, type: 'cif' | 'phone' | 'cccd'): string | null` → decrypt then mask
- Key from `process.env.ENCRYPTION_KEY` (32-byte hex → 256-bit)
- Use Node.js built-in `crypto` module (no external deps)

## Implementation

```typescript
// src/lib/field-encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  return Buffer.from(hex, "hex");
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function decryptField(encrypted: string): string {
  if (!encrypted.startsWith(PREFIX)) return encrypted;
  const parts = encrypted.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const [ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return decipher.update(Buffer.from(dataB64, "base64")) + decipher.final("utf8");
}

export function decryptIfEncrypted(value: string | null | undefined): string | null {
  if (!value) return null;
  return isEncrypted(value) ? decryptField(value) : value;
}
```

## Mask helper

```typescript
// Re-export maskMiddle from security.service.ts (need to export it first)
// Then:
const MASK_CONFIG = {
  cif:   { keepStart: 0, keepEnd: 4 },   // ****-1234
  phone: { keepStart: 3, keepEnd: 3 },   // 091****678
  cccd:  { keepStart: 2, keepEnd: 3 },   // 07****234
} as const;

export function maskPiiField(
  value: string | null | undefined,
  type: keyof typeof MASK_CONFIG,
): string | null {
  if (!value) return null;
  const raw = decryptIfEncrypted(value);
  if (!raw) return null;
  const { keepStart, keepEnd } = MASK_CONFIG[type];
  return maskMiddle(raw, keepStart, keepEnd);
}
```

## Todo

- [ ] Create `src/lib/field-encryption.ts`
- [ ] Export `maskMiddle` from `security.service.ts`
- [ ] Add `ENCRYPTION_KEY` to `.env.example`
- [ ] Compile check

## Success Criteria

- `encryptField("5400-1234")` → `"enc:..."`
- `decryptField(encryptField("5400-1234"))` → `"5400-1234"`
- `maskPiiField("enc:...", "cif")` → `"****1234"`
- `maskPiiField("091234567", "phone")` → `"091****567"` (plaintext passthrough)
