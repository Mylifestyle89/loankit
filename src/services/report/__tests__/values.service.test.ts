/**
 * values.service tests — Phase 3.
 *
 * Coverage:
 *   1. parseEncryptedValuesJson: empty / plaintext fallback / encrypted round-trip / invalid shape / repeater
 *   2. stringifyAndEncryptValues: encrypted prefix / reject invalid shape
 *   3. getCustomerProfile: not-found / empty / populated decrypted
 *   4. saveCustomerProfile: atomic updateMany / VERSION_CONFLICT / NOT_FOUND / invalid shape
 *   5. patchCustomerProfile: shallow merge with parallel-write guard
 *   6. getMergedValuesForExport: dossier overrides customer profile
 *   7. dossier symmetric smoke
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  }
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findUnique: vi.fn(), updateMany: vi.fn() },
    loan: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { parseEncryptedValuesJson, stringifyAndEncryptValues, valuesService } from "../values.service";

const mCustomer = prisma.customer as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};
const mLoan = prisma.loan as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Codec helpers ────────────────────────────────────────────────────────

describe("parseEncryptedValuesJson", () => {
  it("empty/null → {}", () => {
    expect(parseEncryptedValuesJson(null)).toEqual({});
    expect(parseEncryptedValuesJson(undefined)).toEqual({});
    expect(parseEncryptedValuesJson("")).toEqual({});
    expect(parseEncryptedValuesJson("{}")).toEqual({});
  });

  it("plaintext JSON fallback (legacy backfill data)", () => {
    const raw = JSON.stringify({ ten_dn: "ABC", von: 5000 });
    expect(parseEncryptedValuesJson(raw)).toEqual({ ten_dn: "ABC", von: 5000 });
  });

  it("encrypted JSON round-trip", () => {
    const original = { customer_code: "CIF123", phone: "0901234567", null_val: null };
    const encrypted = stringifyAndEncryptValues(original);
    expect(encrypted.startsWith("enc:")).toBe(true);
    expect(parseEncryptedValuesJson(encrypted)).toEqual(original);
  });

  it("invalid shape (nested object at top level) → {} fallback", () => {
    const bad = JSON.stringify({ a: { nested: "object" } });
    expect(parseEncryptedValuesJson(bad)).toEqual({});
  });

  it("repeater arrays accepted", () => {
    const withRepeater = { tsbds: [{ name: "Land", value: 1000 }, { name: "House", value: 2000 }] };
    const enc = stringifyAndEncryptValues(withRepeater);
    expect(parseEncryptedValuesJson(enc)).toEqual(withRepeater);
  });
});

describe("stringifyAndEncryptValues", () => {
  it("returns encrypted string (enc: prefix)", () => {
    expect(stringifyAndEncryptValues({ a: 1 }).startsWith("enc:")).toBe(true);
  });

  it("rejects function values", () => {
    expect(() => stringifyAndEncryptValues({ bad: (() => 1) as unknown as string })).toThrow(/Invalid values shape/);
  });

  it("rejects nested object values (only scalar | array allowed)", () => {
    expect(() => stringifyAndEncryptValues({ nested: { foo: "bar" } as unknown as string })).toThrow();
  });
});

// ─── Customer profile ─────────────────────────────────────────────────────

describe("getCustomerProfile", () => {
  it("throws NotFoundError if customer missing", async () => {
    mCustomer.findUnique.mockResolvedValueOnce(null);
    await expect(valuesService.getCustomerProfile("nope")).rejects.toThrow(/not found/i);
  });

  it("returns {} for empty profile", async () => {
    mCustomer.findUnique.mockResolvedValueOnce({ customerProfileValuesJson: "{}" });
    expect(await valuesService.getCustomerProfile("c1")).toEqual({});
  });

  it("returns decrypted record for populated profile", async () => {
    const data = { ten_dn: "Cty ABC", von: 5e9 };
    mCustomer.findUnique.mockResolvedValueOnce({ customerProfileValuesJson: stringifyAndEncryptValues(data) });
    expect(await valuesService.getCustomerProfile("c1")).toEqual(data);
  });
});

describe("saveCustomerProfile (atomic updateMany)", () => {
  it("happy path = 1 round-trip, encrypted at rest", async () => {
    mCustomer.updateMany.mockResolvedValueOnce({ count: 1 });
    await valuesService.saveCustomerProfile("c1", { ten_dn: "ABC" });

    expect(mCustomer.updateMany).toHaveBeenCalledTimes(1);
    expect(mCustomer.findUnique).not.toHaveBeenCalled();
    const call = mCustomer.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "c1" });
    expect(call.data.customerProfileValuesJson).toMatch(/^enc:/);
  });

  it("uses composite WHERE when expectedUpdatedAt passed", async () => {
    const t = new Date();
    mCustomer.updateMany.mockResolvedValueOnce({ count: 1 });
    await valuesService.saveCustomerProfile("c1", { x: 1 }, { expectedUpdatedAt: t });

    const call = mCustomer.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "c1", updatedAt: t });
  });

  it("throws ConflictError when count=0 and customer exists (stale lock)", async () => {
    mCustomer.updateMany.mockResolvedValueOnce({ count: 0 });
    mCustomer.findUnique.mockResolvedValueOnce({ id: "c1" });
    const stale = new Date(Date.now() - 60_000);
    await expect(
      valuesService.saveCustomerProfile("c1", { x: 1 }, { expectedUpdatedAt: stale }),
    ).rejects.toThrow(/modified by another writer/);
  });

  it("throws NotFoundError when count=0 and customer missing", async () => {
    mCustomer.updateMany.mockResolvedValueOnce({ count: 0 });
    mCustomer.findUnique.mockResolvedValueOnce(null);
    await expect(valuesService.saveCustomerProfile("nope", {})).rejects.toThrow(/not found/i);
  });

  it("rejects invalid shape before hitting DB", async () => {
    await expect(
      valuesService.saveCustomerProfile("c1", { bad: { nested: 1 } as unknown as string }),
    ).rejects.toThrow();
    expect(mCustomer.updateMany).not.toHaveBeenCalled();
  });
});

describe("patchCustomerProfile (read + atomic save)", () => {
  it("shallow merges partial onto existing", async () => {
    const existing = { ten_dn: "ABC", von: 5e9 };
    const t = new Date();
    mCustomer.findUnique.mockResolvedValueOnce({
      customerProfileValuesJson: stringifyAndEncryptValues(existing),
      updatedAt: t,
    });
    mCustomer.updateMany.mockResolvedValueOnce({ count: 1 });

    const merged = await valuesService.patchCustomerProfile("c1", { phone: "0901234567" });
    expect(merged).toEqual({ ten_dn: "ABC", von: 5e9, phone: "0901234567" });
    // Atomic save uses just-read updatedAt as parallel-write guard
    expect(mCustomer.updateMany.mock.calls[0][0].where).toEqual({ id: "c1", updatedAt: t });
  });

  it("partial overrides existing top-level keys", async () => {
    const t = new Date();
    mCustomer.findUnique.mockResolvedValueOnce({
      customerProfileValuesJson: stringifyAndEncryptValues({ a: "old", b: 1 }),
      updatedAt: t,
    });
    mCustomer.updateMany.mockResolvedValueOnce({ count: 1 });

    const merged = await valuesService.patchCustomerProfile("c1", { a: "new", c: 3 });
    expect(merged).toEqual({ a: "new", b: 1, c: 3 });
  });
});

// ─── Merged for export ────────────────────────────────────────────────────

describe("getMergedValuesForExport", () => {
  it("dossier overrides customer profile on key conflict", async () => {
    const customerProfile = { ten_dn: "Cty ABC", duong: "Tran Hung Dao" };
    const dossier = { ten_dn: "Cty ABC (chi nhánh 2)", muc_dich: "Vay HMTD" };
    mLoan.findUnique.mockResolvedValueOnce({
      dossierValuesJson: stringifyAndEncryptValues(dossier),
      customer: { customerProfileValuesJson: stringifyAndEncryptValues(customerProfile) },
    });

    const merged = await valuesService.getMergedValuesForExport("loan1");
    expect(merged).toEqual({
      ten_dn: "Cty ABC (chi nhánh 2)",
      duong: "Tran Hung Dao",
      muc_dich: "Vay HMTD",
    });
  });

  it("throws NotFoundError when loan missing", async () => {
    mLoan.findUnique.mockResolvedValueOnce(null);
    await expect(valuesService.getMergedValuesForExport("nope")).rejects.toThrow(/not found/i);
  });
});

// ─── Dossier symmetric smoke ──────────────────────────────────────────────

describe("dossier values (smoke)", () => {
  it("get/save round-trip via mocked prisma", async () => {
    mLoan.findUnique.mockResolvedValueOnce({ dossierValuesJson: "{}" });
    expect(await valuesService.getDossierValues("loan1")).toEqual({});

    mLoan.updateMany.mockResolvedValueOnce({ count: 1 });
    await valuesService.saveDossierValues("loan1", { mucdich: "Vay vốn" });
    expect(mLoan.updateMany.mock.calls[0][0].data.dossierValuesJson).toMatch(/^enc:/);
  });
});
