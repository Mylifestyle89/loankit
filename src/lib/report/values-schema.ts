/**
 * Shared Zod schemas + types for report module values.
 *
 * Lib-shared (not service-local) — frontend forms can reuse for client-side
 * validation before POSTing to API. See plans/260505-1007-phase1-... Phase 3.
 *
 * Shape: Record<string, scalar | array<record>>
 *   - scalars (string/number/boolean/null) for regular fields
 *   - arrays of records for repeater groups (vd: danh sách TSBĐ, beneficiaries)
 */
import { z } from "zod";

/** Scalar value for a regular field */
export const scalarValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/** One row in a repeater group: arbitrary key→value record.
 *  NOTE: repeater item values not validated — free-form by design (legacy parity với manual-values).
 *  Top-level keys ARE validated by valuesRecordSchema below. */
export const repeaterItemSchema = z.record(z.string(), z.unknown());

/** Top-level values record — the canonical shape for both
 *  Customer.customerProfileValuesJson and Loan.dossierValuesJson */
export const valuesRecordSchema = z.record(
  z.string(),
  z.union([scalarValueSchema, z.array(repeaterItemSchema)]),
);

export type ScalarValue = z.infer<typeof scalarValueSchema>;
export type RepeaterItem = z.infer<typeof repeaterItemSchema>;
export type ValuesRecord = z.infer<typeof valuesRecordSchema>;
