"use client";

/**
 * Review step for the DOCX import modal. Owns no state — all edits bubble
 * up via a single stable `onSectionChange` callback so React.memo on
 * FieldSection actually prevents cross-section re-renders.
 */

import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";

import type {
  ExtractedCoBorrower,
  ExtractedCollateral,
  ExtractedCustomer,
  ExtractedLoan,
} from "@/services/customer-docx-extraction.service";

import {
  FieldSection,
  type FieldValue,
  type SectionChangeHandler,
  type SectionKind,
} from "./customer-docx-import-modal-field-section";
import {
  CO_BORROWER_LABELS,
  COLLATERAL_COMMON_LABELS,
  CUSTOMER_LABELS,
  LOAN_LABELS,
  NUMBER_FIELD_KEYS,
  getCollateralTypeLabels,
} from "./customer-docx-import-modal-labels";

export type ReviewData = {
  customer: Partial<ExtractedCustomer>;
  loans: Partial<ExtractedLoan>[];
  collaterals: Partial<ExtractedCollateral>[];
  co_borrowers: Partial<ExtractedCoBorrower>[];
};

type Props = {
  extracted: ReviewData;
  duplicateWarning: string;
  error: string;
  submitting: boolean;
  onUpdateField: (kind: SectionKind, index: number, key: string, value: FieldValue) => void;
  onAddCoBorrower: () => void;
  onRemoveCoBorrower: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
};

export function CustomerDocxImportReviewStep(props: Props) {
  const {
    extracted,
    duplicateWarning,
    error,
    submitting,
    onUpdateField,
    onAddCoBorrower,
    onRemoveCoBorrower,
    onBack,
    onSubmit,
  } = props;

  // Stable forwarding callback — because `onUpdateField` is already memoized
  // by the parent modal, this reference stays stable, preserving FieldSection.memo.
  const handleSectionChange = useCallback<SectionChangeHandler>(
    (kind, index, key, value) => onUpdateField(kind, index, key, value),
    [onUpdateField],
  );

  // Pre-compute collateral labels once per collateral list reference.
  // Avoids creating a new object on every render (which defeats React.memo on FieldSection).
  const collateralLabelsList = useMemo(
    () => extracted.collaterals.map((col) => ({
      ...COLLATERAL_COMMON_LABELS,
      ...getCollateralTypeLabels(col.type),
    })),
    [extracted.collaterals],
  );

  return (
    <>
      {duplicateWarning && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{duplicateWarning}</span>
        </div>
      )}

      <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
        <FieldSection
          title="Thông tin khách hàng"
          labels={CUSTOMER_LABELS}
          data={extracted.customer as Record<string, FieldValue>}
          sectionKind="customer"
          sectionIndex={0}
          onSectionChange={handleSectionChange}
          numberFieldKeys={NUMBER_FIELD_KEYS}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Người đồng vay ({extracted.co_borrowers.length})
            </h3>
            <button
              type="button"
              onClick={onAddCoBorrower}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              + Thêm
            </button>
          </div>
          {extracted.co_borrowers.map((cob, i) => (
            <FieldSection
              key={`cob-${i}`}
              title={`Người đồng vay ${i + 1}`}
              labels={CO_BORROWER_LABELS}
              data={cob as Record<string, FieldValue>}
              sectionKind="co_borrower"
              sectionIndex={i}
              onSectionChange={handleSectionChange}
              numberFieldKeys={NUMBER_FIELD_KEYS}
              onRemoveSection={onRemoveCoBorrower}
            />
          ))}
        </div>

        {extracted.loans.map((loan, i) => (
          <FieldSection
            key={`loan-${i}`}
            title={`Khoản vay ${extracted.loans.length > 1 ? i + 1 : ""}`.trim()}
            labels={LOAN_LABELS}
            data={loan as Record<string, FieldValue>}
            sectionKind="loan"
            sectionIndex={i}
            onSectionChange={handleSectionChange}
            numberFieldKeys={NUMBER_FIELD_KEYS}
          />
        ))}

        {extracted.collaterals.map((col, i) => (
          <FieldSection
            key={`col-${i}`}
            title={`Tài sản bảo đảm ${extracted.collaterals.length > 1 ? i + 1 : ""}`.trim()}
            labels={collateralLabelsList[i] ?? COLLATERAL_COMMON_LABELS}
            data={col as Record<string, FieldValue>}
            sectionKind="collateral"
            sectionIndex={i}
            onSectionChange={handleSectionChange}
            numberFieldKeys={NUMBER_FIELD_KEYS}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/15 dark:hover:bg-white/5"
        >
          Thử lại
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {submitting ? "Đang tạo..." : "Tạo khách hàng"}
        </button>
      </div>
    </>
  );
}
