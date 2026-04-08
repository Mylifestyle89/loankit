// Unit tests for field-encryption: HMAC determinism + CoBorrower/RelatedPerson round-trip.

import { describe, it, expect, beforeAll } from "vitest";
import {
  hashCustomerCode,
  hashLookupValue,
  encryptCoBorrowerPii,
  decryptCoBorrowerPii,
  encryptRelatedPersonPii,
  decryptRelatedPersonPii,
  encryptField,
  decryptField,
  isEncrypted,
} from "../field-encryption";

beforeAll(() => {
  // Deterministic 32-byte key so tests do not depend on environment.
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  }
});

describe("hashCustomerCode + hashLookupValue", () => {
  it("same input → same hash (deterministic)", () => {
    const first = hashCustomerCode("CIF12345678");
    const second = hashCustomerCode("CIF12345678");
    expect(first).toBe(second);
  });

  it("different inputs → different hashes", () => {
    expect(hashCustomerCode("CIF12345678")).not.toBe(hashCustomerCode("CIF87654321"));
  });

  it("is not the plaintext (cannot reverse)", () => {
    const plain = "CIF12345678";
    const hash = hashCustomerCode(plain);
    expect(hash).not.toContain(plain);
    expect(hash.length).toBeGreaterThan(20);
  });

  it("hashLookupValue and hashCustomerCode agree on same input", () => {
    expect(hashCustomerCode("abc")).toBe(hashLookupValue("abc"));
  });
});

describe("encryptCoBorrowerPii round-trip", () => {
  const sample = {
    id: "cb_1",
    full_name: "Nguyễn Văn A",
    id_number: "012345678901",
    id_old: "123456789",
    phone: "0912345678",
    current_address: "123 Lê Lợi, Đà Lạt",
    permanent_address: "456 Trần Phú, Đà Lạt",
    birth_year: 1985, // non-PII — must pass through untouched
  };

  it("encrypts every configured PII field", () => {
    const enc = encryptCoBorrowerPii(sample);
    expect(isEncrypted(enc.full_name)).toBe(true);
    expect(isEncrypted(enc.id_number)).toBe(true);
    expect(isEncrypted(enc.phone)).toBe(true);
    expect(isEncrypted(enc.current_address)).toBe(true);
    // birth_year is a number + not in PII list → untouched
    expect(enc.birth_year).toBe(1985);
  });

  it("decrypts back to the original values", () => {
    const enc = encryptCoBorrowerPii(sample);
    const dec = decryptCoBorrowerPii(enc);
    expect(dec.full_name).toBe(sample.full_name);
    expect(dec.id_number).toBe(sample.id_number);
    expect(dec.phone).toBe(sample.phone);
    expect(dec.current_address).toBe(sample.current_address);
  });

  it("leaves null/undefined fields alone", () => {
    const partial = { id: "cb_2", full_name: "Bà B", id_number: null, phone: undefined };
    const enc = encryptCoBorrowerPii(partial as unknown as typeof sample);
    expect(enc.id_number).toBeNull();
    expect(enc.phone).toBeUndefined();
    expect(isEncrypted(enc.full_name)).toBe(true);
  });

  it("is idempotent: re-encrypting an already-encrypted row is a no-op", () => {
    const once = encryptCoBorrowerPii(sample);
    const twice = encryptCoBorrowerPii(once);
    expect(twice.full_name).toBe(once.full_name);
    expect(twice.id_number).toBe(once.id_number);
  });
});

describe("encryptRelatedPersonPii round-trip", () => {
  const sample = { id: "rp_1", id_number: "079123456789", address: "789 Hòa Bình, Đà Lạt" };

  it("encrypts + decrypts back to the original", () => {
    const enc = encryptRelatedPersonPii(sample);
    expect(isEncrypted(enc.id_number)).toBe(true);
    expect(isEncrypted(enc.address)).toBe(true);
    const dec = decryptRelatedPersonPii(enc);
    expect(dec.id_number).toBe(sample.id_number);
    expect(dec.address).toBe(sample.address);
  });
});

describe("encryptField random IV", () => {
  it("same plaintext → different ciphertext each call", () => {
    const a = encryptField("hello");
    const b = encryptField("hello");
    expect(a).not.toBe(b);
    // But both decrypt to the same thing
    expect(decryptField(a)).toBe("hello");
    expect(decryptField(b)).toBe("hello");
  });
});
