/** Helper functions for customer data transformation */

import { encryptCustomerPii, hashCustomerCode } from "@/lib/field-encryption";

import type { CreateCustomerInput, UpdateCustomerInput } from "./customer-service-types";

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function toStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Derive gender from Vietnamese prefix: Ông→male, Bà→female */
export function deriveGender(prefix: string | null): string | null {
  if (!prefix) return null;
  const p = prefix.trim().toLowerCase();
  if (p === "ông" || p === "mr") return "male";
  if (p === "bà" || p === "mrs" || p === "ms") return "female";
  return null;
}

export function parseCustomerDataJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function toCreateDbData(input: CreateCustomerInput) {
  const raw = {
    customer_code: input.customer_code,
    customer_name: input.customer_name,
    customer_type: input.customer_type ?? "corporate",
    address: input.address ?? null,
    main_business: input.main_business ?? null,
    charter_capital: input.charter_capital ?? null,
    legal_representative_name: input.legal_representative_name ?? null,
    legal_representative_title: input.legal_representative_title ?? null,
    organization_type: input.organization_type ?? null,
    cccd: input.cccd ?? null,
    cccd_old: input.cccd_old ?? null,
    cccd_issued_date: input.cccd_issued_date ?? null,
    cccd_issued_place: input.cccd_issued_place ?? null,
    date_of_birth: input.date_of_birth ?? null,
    gender: input.gender ?? null,
    phone: input.phone ?? null,
    marital_status: input.marital_status ?? null,
    spouse_name: input.spouse_name ?? null,
    spouse_cccd: input.spouse_cccd ?? null,
    bank_account: input.bank_account ?? null,
    bank_name: input.bank_name ?? null,
    cic_product_name: input.cic_product_name ?? null,
    cic_product_code: input.cic_product_code ?? null,
    email: input.email ?? null,
    ...(input.documents_pa_json !== undefined ? { documents_pa_json: input.documents_pa_json } : {}),
    ...(input.data_json !== undefined ? { data_json: JSON.stringify(input.data_json) } : {}),
  };
  // Encrypt PII fields before DB write + compute deterministic hash for
  // lookup. The hash is derived from the plaintext CIF before encryption.
  const encrypted = encryptCustomerPii(raw);
  return { ...encrypted, customer_code_hash: hashCustomerCode(input.customer_code) };
}

export function toUpdateDbData(input: UpdateCustomerInput) {
  const data: Record<string, unknown> = {};
  if (input.customer_code !== undefined) data.customer_code = input.customer_code;
  if (input.customer_name !== undefined) data.customer_name = input.customer_name;
  if (input.customer_type !== undefined) data.customer_type = input.customer_type;
  if (input.address !== undefined) data.address = input.address;
  if (input.main_business !== undefined) data.main_business = input.main_business;
  if (input.charter_capital !== undefined) data.charter_capital = input.charter_capital;
  if (input.legal_representative_name !== undefined) data.legal_representative_name = input.legal_representative_name;
  if (input.legal_representative_title !== undefined) data.legal_representative_title = input.legal_representative_title;
  if (input.organization_type !== undefined) data.organization_type = input.organization_type;
  if (input.cccd !== undefined) data.cccd = input.cccd;
  if (input.cccd_old !== undefined) data.cccd_old = input.cccd_old;
  if (input.cccd_issued_date !== undefined) data.cccd_issued_date = input.cccd_issued_date;
  if (input.cccd_issued_place !== undefined) data.cccd_issued_place = input.cccd_issued_place;
  if (input.date_of_birth !== undefined) data.date_of_birth = input.date_of_birth;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.marital_status !== undefined) data.marital_status = input.marital_status;
  if (input.spouse_name !== undefined) data.spouse_name = input.spouse_name;
  if (input.spouse_cccd !== undefined) data.spouse_cccd = input.spouse_cccd;
  if (input.bank_account !== undefined) data.bank_account = input.bank_account;
  if (input.bank_name !== undefined) data.bank_name = input.bank_name;
  if (input.cic_product_name !== undefined) data.cic_product_name = input.cic_product_name;
  if (input.cic_product_code !== undefined) data.cic_product_code = input.cic_product_code;
  if (input.email !== undefined) data.email = input.email;
  if (input.active_branch_id !== undefined) data.active_branch_id = input.active_branch_id;
  if (input.relationship_officer !== undefined) data.relationship_officer = input.relationship_officer;
  if (input.appraiser !== undefined) data.appraiser = input.appraiser;
  if (input.approver_name !== undefined) data.approver_name = input.approver_name;
  if (input.approver_title !== undefined) data.approver_title = input.approver_title;
  if (input.documents_pa_json !== undefined) data.documents_pa_json = input.documents_pa_json;
  if (input.data_json !== undefined) data.data_json = JSON.stringify(input.data_json);
  // Encrypt PII fields before DB write. If customer_code is being changed,
  // refresh customer_code_hash from the new plaintext so lookups stay valid.
  const encrypted = encryptCustomerPii(data);
  if (typeof input.customer_code === "string" && input.customer_code) {
    (encrypted as Record<string, unknown>).customer_code_hash = hashCustomerCode(input.customer_code);
  }
  return encrypted;
}
