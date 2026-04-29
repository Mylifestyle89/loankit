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
import { mapExtractedToFormProperties } from "@/lib/collateral/map-extracted-collateral";
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
