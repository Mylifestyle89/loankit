/**
 * Customer draft operations — saveFromDraft (BK import) and toDraft (export to form values).
 */
import type { Customer } from "@prisma/client";

import { NotFoundError, ValidationError } from "@/core/errors/app-error";
import { prisma } from "@/lib/prisma";
import {
  extractCoBorrower,
  extractCollateral,
  extractCreditAgribank,
  extractCreditOther,
  extractLoan,
  extractDisbursement,
  extractBeneficiary,
  extractAllCoBorrowers,
  extractAllCollaterals,
  extractAllCreditAgribank,
  extractAllCreditOther,
  extractAllDisbursements,
  extractAllBeneficiaries,
  extractSavingsCollateral,
  extractAllSavingsCollaterals,
} from "./bk-to-customer-relations";
import {
  toNumber,
  toStringOrNull,
  deriveGender,
  parseCustomerDataJson,
} from "./customer-service-helpers";
import {
  decryptCustomerPii,
  encryptCoBorrowerPii,
  encryptCustomerPii,
  hashCustomerCode,
} from "@/lib/field-encryption";

// Column → field key mapping (shared with customer.service.ts)
const FIELD_TO_COLUMN: Record<string, string> = {
  "A.general.customer_name": "customer_name",
  "A.general.customer_code": "customer_code",
  "A.general.address": "address",
  "A.general.main_business": "main_business",
  "A.general.charter_capital": "charter_capital",
  "A.general.legal_representative_name": "legal_representative_name",
  "A.general.legal_representative_title": "legal_representative_title",
  "A.general.organization_type": "organization_type",
  "A.general.cccd": "cccd",
  "A.management.id_issue_date": "cccd_issued_date",
  "A.management.id_issue_location": "cccd_issued_place",
  "A.general.date_of_birth": "date_of_birth",
  "A.general.gender_prefix": "gender",
  "A.general.phone": "phone",
  "A.general.marital_status": "marital_status",
  "A.general.spouse_name": "spouse_name",
  "A.general.spouse_cccd": "spouse_cccd",
  "A.credit.bank_account_number": "bank_account",
  "A.credit.bank_account_location": "bank_name",
  "A.general.customer_type": "customer_type",
};

const COLUMN_TO_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_TO_COLUMN).map(([field, col]) => [col, field]),
);

export async function saveFromDraft(
  values: Record<string, unknown>,
  assetGroups?: Record<string, Record<string, string>[]>,
): Promise<{ customer: Customer; created: boolean; message: string }> {
  const customer_name = toStringOrNull(values["A.general.customer_name"]);
  const customer_code = toStringOrNull(values["A.general.customer_code"]);
  if (!customer_name) {
    throw new ValidationError("Tên khách hàng (A.general.customer_name) không được để trống.");
  }

  const cccd = toStringOrNull(values["A.general.cccd"]);
  const isIndividual = !!cccd || values["A.general.customer_type"] === "individual";

  const payload = {
    customer_code: customer_code ?? customer_name,
    customer_name,
    customer_type: isIndividual ? "individual" : "corporate",
    address: toStringOrNull(values["A.general.address"]),
    main_business: toStringOrNull(values["A.general.main_business"]),
    charter_capital: toNumber(values["A.general.charter_capital"]),
    legal_representative_name: toStringOrNull(values["A.general.legal_representative_name"]),
    legal_representative_title: toStringOrNull(values["A.general.legal_representative_title"]),
    organization_type: toStringOrNull(values["A.general.organization_type"]),
    cccd,
    cccd_issued_date: toStringOrNull(values["A.management.id_issue_date"]),
    cccd_issued_place: toStringOrNull(values["A.management.id_issue_location"]),
    date_of_birth: toStringOrNull(values["A.general.date_of_birth"]),
    gender: deriveGender(toStringOrNull(values["A.general.gender_prefix"])),
    phone: toStringOrNull(values["A.general.phone"]),
    marital_status: toStringOrNull(values["A.general.marital_status"]),
    spouse_name: toStringOrNull(values["A.general.spouse_name"]),
    spouse_cccd: toStringOrNull(values["A.general.spouse_cccd"]),
    bank_account: toStringOrNull(values["A.credit.bank_account_number"]),
    bank_name: toStringOrNull(values["A.credit.bank_account_location"]),
  };

  const data_json: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key in FIELD_TO_COLUMN) continue;
    data_json[key] = value;
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findFirst({
      where: { customer_name: payload.customer_name },
      orderBy: { updatedAt: "desc" },
    });

    const sharedData = {
      customer_code: payload.customer_code,
      customer_type: payload.customer_type,
      address: payload.address,
      main_business: payload.main_business,
      charter_capital: payload.charter_capital,
      legal_representative_name: payload.legal_representative_name,
      legal_representative_title: payload.legal_representative_title,
      organization_type: payload.organization_type,
      cccd: payload.cccd,
      cccd_issued_date: payload.cccd_issued_date,
      cccd_issued_place: payload.cccd_issued_place,
      date_of_birth: payload.date_of_birth,
      gender: payload.gender,
      phone: payload.phone,
      marital_status: payload.marital_status,
      spouse_name: payload.spouse_name,
      spouse_cccd: payload.spouse_cccd,
      bank_account: payload.bank_account,
      bank_name: payload.bank_name,
      data_json: JSON.stringify(data_json),
    };

    const encryptedData = encryptCustomerPii(sharedData);
    // Deterministic hash so lookups by plaintext CIF still work even though
    // customer_code stores a random-IV ciphertext.
    const customer_code_hash = hashCustomerCode(payload.customer_code);

    let customer: Customer;
    let created: boolean;
    if (existing) {
      customer = await tx.customer.update({
        where: { id: existing.id },
        data: { ...encryptedData, customer_code_hash },
      });
      created = false;
      await tx.coBorrower.deleteMany({ where: { customerId: customer.id } });
      await tx.collateral.deleteMany({ where: { customerId: customer.id } });
      await tx.creditAtAgribank.deleteMany({ where: { customerId: customer.id } });
      await tx.creditAtOther.deleteMany({ where: { customerId: customer.id } });
      await tx.loan.deleteMany({ where: { customerId: customer.id } });
    } else {
      customer = await tx.customer.create({
        data: { customer_name: payload.customer_name, ...encryptedData, customer_code_hash },
      });
      created = true;
    }

    const resolve = <T>(
      code: string,
      allFn: (i: Record<string, unknown>[]) => T[],
      singleFn: (v: Record<string, unknown>) => T | null,
    ): T[] =>
      assetGroups?.[code]?.length
        ? allFn(assetGroups[code])
        : [singleFn(values)].filter((x): x is T => x !== null);

    const cbData = resolve("TV", extractAllCoBorrowers, extractCoBorrower).map((cb) => {
      // Apply full CoBorrower PII encryption (full_name, id_number, phone,
      // addresses, …) not just phone. The helper is idempotent.
      return encryptCoBorrowerPii({ customerId: customer.id, ...cb });
    });
    if (cbData.length) await tx.coBorrower.createMany({ data: cbData });

    const landCol = resolve("SĐ", extractAllCollaterals, extractCollateral).map((c) => ({
      customerId: customer.id,
      ...c,
    }));
    const stkCol = resolve("STK", extractAllSavingsCollaterals, extractSavingsCollateral).map((c) => ({
      customerId: customer.id,
      ...c,
    }));
    const colData = [...landCol, ...stkCol];
    if (colData.length) await tx.collateral.createMany({ data: colData });

    const caData = resolve("VBA", extractAllCreditAgribank, extractCreditAgribank).map((c) => ({
      customerId: customer.id,
      ...c,
    }));
    if (caData.length) await tx.creditAtAgribank.createMany({ data: caData });

    const coData = resolve("TCTD", extractAllCreditOther, extractCreditOther).map((c) => ({
      customerId: customer.id,
      ...c,
    }));
    if (coData.length) await tx.creditAtOther.createMany({ data: coData });

    const loanData = extractLoan(values);
    if (loanData) {
      const loan = await tx.loan.create({ data: { customerId: customer.id, ...loanData } });

      await tx.beneficiary.deleteMany({ where: { loanId: loan.id } });
      await tx.disbursement.deleteMany({ where: { loanId: loan.id } });

      const disbData = resolve("GN", extractAllDisbursements, extractDisbursement).map((d) => ({
        loanId: loan.id,
        disbursementDate: new Date(),
        ...d,
      }));
      if (disbData.length) await tx.disbursement.createMany({ data: disbData });

      const benData = resolve("UNC", extractAllBeneficiaries, extractBeneficiary).map((b) => ({
        loanId: loan.id,
        ...b,
      }));
      if (benData.length) await tx.beneficiary.createMany({ data: benData });
    }

    const action = created ? "Tạo mới" : "Cập nhật";
    return { customer, created, message: `${action} khách hàng và dữ liệu liên quan thành công.` };
  });
}

export async function toDraft(params: {
  customerId?: string;
  customerName?: string;
}): Promise<{ customer: Customer; values: Record<string, unknown> }> {
  if (!params.customerId && !params.customerName) {
    throw new ValidationError("customer_id hoặc customer_name phải được cung cấp.");
  }

  const customer = params.customerId
    ? await prisma.customer.findUnique({ where: { id: params.customerId } })
    : await prisma.customer.findFirst({
        where: { customer_name: params.customerName },
        orderBy: { updatedAt: "desc" },
      });
  if (!customer) throw new NotFoundError("Không tìm thấy khách hàng.");
  Object.assign(customer, decryptCustomerPii(customer));

  const values: Record<string, unknown> = {};
  const columnFields: Array<[string, unknown]> = [
    ["customer_name", customer.customer_name],
    ["customer_code", customer.customer_code],
    ["customer_type", customer.customer_type],
    ["address", customer.address],
    ["main_business", customer.main_business],
    ["charter_capital", customer.charter_capital],
    ["legal_representative_name", customer.legal_representative_name],
    ["legal_representative_title", customer.legal_representative_title],
    ["organization_type", customer.organization_type],
    ["cccd", customer.cccd],
    ["cccd_issued_date", customer.cccd_issued_date],
    ["cccd_issued_place", customer.cccd_issued_place],
    ["date_of_birth", customer.date_of_birth],
    ["gender", customer.gender],
    ["phone", customer.phone],
    ["marital_status", customer.marital_status],
    ["spouse_name", customer.spouse_name],
    ["spouse_cccd", customer.spouse_cccd],
    ["bank_account", customer.bank_account],
    ["bank_name", customer.bank_name],
  ];
  for (const [col, val] of columnFields) {
    if (val != null && val !== "") {
      const fieldKey = COLUMN_TO_FIELD[col];
      if (fieldKey) values[fieldKey] = val;
    }
  }

  const extraData = parseCustomerDataJson(customer.data_json);
  Object.assign(values, extraData);

  return { customer, values };
}
