/**
 * Submit handler for the DOCX import review modal. Creates the customer
 * first (need its id) then fans out loans, collaterals, and co-borrowers
 * concurrently. Nested failures degrade into warnings — only a failed
 * customer create throws.
 */

import type {
  ExtractedCoBorrower,
  ExtractedCollateral,
  ExtractedCustomer,
  ExtractedLoan,
} from "@/services/customer-docx-extraction.service";
import { toStringOrNull } from "@/services/customer-service-helpers";

export type SubmitExtractedPayload = {
  customer: Partial<ExtractedCustomer>;
  loans: Partial<ExtractedLoan>[];
  collaterals: Partial<ExtractedCollateral>[];
  co_borrowers: Partial<ExtractedCoBorrower>[];
};

export type SubmitResult = {
  customerId: string;
  warnings: string[];
};

/**
 * Map ExtractedCollateral fields → CollateralItem.properties keys used by the form.
 * Also converts all numeric values to strings to avoid form crashes.
 */
function mapExtractedToFormProperties(
  type: string,
  extracted: Record<string, unknown>,
): Record<string, string> {
  const s = (v: unknown): string => (v == null ? "" : String(v));

  if (type === "qsd_dat") {
    return {
      certificate_name: s(extracted.gcn_name),
      serial: s(extracted.certificate_serial),
      issuing_authority: s(extracted.gcn_issued_by),
      certificate_issue_date: s(extracted.gcn_issued_date),
      lot_number: s(extracted.lot_number),
      map_sheet: s(extracted.sheet_number),
      land_address: s(extracted.land_address),
      land_area: s(extracted.land_area),
      ownership_form: s(extracted.land_usage_form),
      land_purpose: s(extracted.land_usage_purpose),
      land_use_term: s(extracted.land_usage_duration),
      land_origin: s(extracted.land_origin),
      land_type_1: s(extracted.land_type_1),
      land_unit_price_1: s(extracted.land_unit_price_1),
      land_type_2: s(extracted.land_type_2),
      land_unit_price_2: s(extracted.land_unit_price_2),
      house_type: s(extracted.building_type),
      construction_area: s(extracted.building_built_area),
      floor_area: s(extracted.building_floor_area),
      house_structure: s(extracted.building_structure),
      house_ownership: s(extracted.building_ownership_form),
      house_level: s(extracted.building_grade),
      floor_number: s(extracted.building_floors),
      asset_usage_status: s(extracted.asset_condition),
      advantage_summary: s(extracted.liquidity_note),
      insurance_status: s(extracted.insurance_note),
    };
  }

  if (type === "dong_san") {
    return {
      registration_number: s(extracted.certificate_serial), // Giấy đăng ký số
      registration_place: s(extracted.gcn_issued_by),
      registration_date: s(extracted.gcn_issued_date),
      license_plate: s(extracted.registration_number),      // Biển kiểm soát
      brand: s(extracted.brand),
      model_code: s(extracted.model),
      color: s(extracted.color),
      manufacture_year: s(extracted.year),
      chassis_number: s(extracted.chassis_number),
      engine_number: s(extracted.engine_number),
      seat_count: s(extracted.seat_count),
      asset_usage_status: s(extracted.asset_condition),
      advantage_summary: s(extracted.liquidity_note),
      insurance_status: s(extracted.insurance_note),
    };
  }

  if (type === "tiet_kiem") {
    return {
      serial: s(extracted.savings_book_number),
      issuer: s(extracted.deposit_bank_name),
      balance: s(extracted.deposit_amount),
      issue_date: s(extracted.deposit_date),
    };
  }

  // tai_san_khac — stringify all values
  return Object.fromEntries(
    Object.entries(extracted).map(([k, v]) => [k, s(v)]),
  );
}

/** Safe ISO date — falls back to today when missing/invalid. */
function isoOrToday(val: string | undefined): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  return val;
}

export async function submitExtractedDocxImport(
  payload: SubmitExtractedPayload,
): Promise<SubmitResult> {
  const c = payload.customer;
  const warnings: string[] = [];

  const custRes = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_name: toStringOrNull(c.customer_name) ?? "Chưa xác định",
      customer_code: toStringOrNull(c.customer_code) ?? `DOCX-${Date.now()}`,
      customer_type: "individual",
      cccd: toStringOrNull(c.cccd),
      cccd_old: toStringOrNull(c.cccd_old),
      cccd_issued_date: toStringOrNull(c.cccd_issued_date),
      cccd_issued_place: toStringOrNull(c.cccd_issued_place),
      date_of_birth: toStringOrNull(c.date_of_birth),
      gender: toStringOrNull(c.gender),
      phone: toStringOrNull(c.phone),
      email: toStringOrNull(c.email),
      bank_account: toStringOrNull(c.bank_account),
      bank_name: toStringOrNull(c.bank_name),
      address: toStringOrNull(c.address),
      marital_status: toStringOrNull(c.marital_status),
      spouse_name: toStringOrNull(c.spouse_name),
      spouse_cccd: toStringOrNull(c.spouse_cccd),
      data_json: { import_source: "docx" },
    }),
  });
  const custData = (await custRes.json()) as { ok: boolean; customer?: { id: string }; error?: string };
  if (!custData.ok || !custData.customer) {
    throw new Error(custData.error || "Tạo khách hàng thất bại");
  }
  const customerId = custData.customer.id;

  // ── 2) Parallel fan-out: loans + collaterals + co-borrowers ──────────────
  const loanPromises = payload.loans
    .filter((loan) => loan.contract_number || loan.loan_amount)
    .map((loan) =>
      fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          contractNumber: String(loan.contract_number || ""),
          loanAmount: Number(loan.loan_amount) || 0,
          interestRate: Number(loan.interest_rate) || 0,
          startDate: isoOrToday(loan.start_date),
          endDate: isoOrToday(loan.end_date),
          purpose: String(loan.purpose || ""),
          loan_method: toStringOrNull(loan.loan_method),
          lending_method: toStringOrNull(loan.lending_method),
          principal_schedule: toStringOrNull(loan.principal_schedule),
          interest_schedule: toStringOrNull(loan.interest_schedule),
          total_capital_need: Number(loan.total_capital_need) || null,
          equity_amount: Number(loan.equity_amount) || null,
          expected_revenue: Number(loan.expected_revenue) || null,
          expected_profit: Number(loan.expected_profit) || null,
        }),
      }).then((r) => r.json()),
    );

  const collateralPromises = payload.collaterals
    .filter((col) => col.name)
    .map((col) => {
      const { name, type, total_value, obligation, ...rest } = col;
      return fetch(`/api/customers/${customerId}/collaterals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collateral_type: String(type || "qsd_dat"),
          name: String(name),
          total_value: Number(total_value) || null,
          obligation: Number(obligation) || null,
          properties: mapExtractedToFormProperties(String(type || "qsd_dat"), rest),
        }),
      }).then((r) => r.json());
    });

  const coBorrowerPromises = payload.co_borrowers
    .filter((cob) => cob.full_name)
    .map((cob) =>
      fetch(`/api/customers/${customerId}/co-borrowers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: cob.full_name,
          id_number: toStringOrNull(cob.id_number),
          id_old: toStringOrNull(cob.id_old),
          id_issued_date: toStringOrNull(cob.id_issued_date),
          id_issued_place: toStringOrNull(cob.id_issued_place),
          birth_year: toStringOrNull(cob.birth_year),
          phone: toStringOrNull(cob.phone),
          current_address: toStringOrNull(cob.current_address),
          permanent_address: toStringOrNull(cob.permanent_address),
          relationship: toStringOrNull(cob.relationship),
        }),
      }).then((r) => r.json()),
    );

  const [loanResults, colResults, cobResults] = await Promise.all([
    Promise.allSettled(loanPromises),
    Promise.allSettled(collateralPromises),
    Promise.allSettled(coBorrowerPromises),
  ]);

  const countFails = (results: PromiseSettledResult<{ ok?: boolean }>[]) =>
    results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value?.ok)).length;

  const loanFails = countFails(loanResults);
  const colFails = countFails(colResults);
  const cobFails = countFails(cobResults);

  if (loanFails > 0) warnings.push(`${loanFails} khoản vay tạo thất bại`);
  if (colFails > 0) warnings.push(`${colFails} TSBĐ tạo thất bại`);
  if (cobFails > 0) warnings.push(`${cobFails} người đồng vay tạo thất bại`);

  return { customerId, warnings };
}
