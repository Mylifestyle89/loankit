"use client";

/**
 * DOCX import modal — AI-assisted customer onboarding from Vietnamese bank
 * loan documents. Owns the step state (upload → processing → review) and
 * delegates the heavy review UI + submit flow to sibling modules.
 *
 * Re-render behavior:
 * - Update handlers use the functional setExtracted form, so individual
 *   field edits do not leak stale state between sections.
 * - Sections in the review step are React.memo'd so typing in one section
 *   does not re-render siblings.
 */

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { BaseModal } from "@/components/ui/base-modal";
import type {
  ExtractedCoBorrower,
  ExtractedCollateral,
  ExtractedCustomer,
  ExtractedLoan,
} from "@/services/customer-docx-extraction.service";

import type { FieldValue, SectionKind } from "./customer-docx-import-modal-field-section";
import { CustomerDocxImportReviewStep } from "./customer-docx-import-modal-review-step";
import { submitExtractedDocxImport } from "./customer-docx-import-modal-submit";

// ─── Types ───────────────────────────────────────────────────────────────────

type ExtractedData = {
  customer: Partial<ExtractedCustomer>;
  loans: Partial<ExtractedLoan>[];
  collaterals: Partial<ExtractedCollateral>[];
  co_borrowers: Partial<ExtractedCoBorrower>[];
};

type Step = "upload" | "processing" | "review";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  basePath: string;
};

const MAX_FILES = 5;

// ─── Component ───────────────────────────────────────────────────────────────

export function CustomerDocxImportModal({ open, onClose, onSuccess, basePath }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  function reset() {
    setStep("upload");
    setFiles([]);
    setExtracted(null);
    setError("");
    setDuplicateWarning("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function addFiles(newFiles: FileList | File[]) {
    const incoming = Array.from(newFiles)
      .filter((f) => f.name.endsWith(".docx"))
      .slice(0, MAX_FILES - files.length);
    if (incoming.length === 0) {
      setError("Chỉ chấp nhận file .docx");
      return;
    }
    setError("");
    setFiles((prev) => [...prev, ...incoming]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Step 1 → 2: Upload + AI extract ──

  async function handleExtract() {
    if (files.length === 0) return;
    setStep("processing");
    setError("");

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/customers/import-docx", { method: "POST", body: fd });
      const data = (await res.json()) as {
        ok: boolean;
        extracted?: ExtractedData;
        error?: string;
      };

      if (!data.ok || !data.extracted) throw new Error(data.error || "Trích xuất thất bại");

      // Defensive normalization: backend may omit co_borrowers on older responses.
      const normalized: ExtractedData = {
        customer: data.extracted.customer ?? {},
        loans: data.extracted.loans ?? [],
        collaterals: data.extracted.collaterals ?? [],
        co_borrowers: data.extracted.co_borrowers ?? [],
      };
      setExtracted(normalized);

      // Non-blocking duplicate check by CCCD
      const cccd = normalized.customer?.cccd;
      if (cccd) {
        try {
          const checkRes = await fetch(`/api/customers?type=individual`);
          const checkData = (await checkRes.json()) as {
            ok: boolean;
            customers?: Array<{ cccd?: string; customer_name?: string }>;
          };
          if (checkData.ok) {
            const dup = (checkData.customers ?? []).find((c) => c.cccd === cccd);
            if (dup) setDuplicateWarning(`CCCD "${cccd}" đã tồn tại: ${dup.customer_name}`);
          }
        } catch {
          /* duplicate check is non-blocking */
        }
      }

      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
      setStep("upload");
    }
  }

  // ── Step 3: Submit ──

  async function handleSubmit() {
    if (!extracted) return;
    setSubmitting(true);
    setError("");
    try {
      const { customerId, warnings } = await submitExtractedDocxImport(extracted);
      onSuccess();
      handleClose();
      if (warnings.length > 0) {
        alert(`Khách hàng đã tạo thành công.\n⚠️ ${warnings.join(", ")}`);
      }
      router.push(`${basePath}/${customerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSubmitting(false);
    }
  }

  // Single stable update callback — functional setState so it never reads
  // stale `extracted`. One handler for every section instead of four, so
  // the FieldSection memo does not get defeated by per-row inline arrows.
  const updateField = useCallback(
    (kind: SectionKind, index: number, key: string, value: FieldValue) => {
      setExtracted((prev) => {
        if (!prev) return prev;
        if (kind === "customer") {
          return { ...prev, customer: { ...prev.customer, [key]: value } };
        }
        const listKey = kind === "loan" ? "loans" : kind === "collateral" ? "collaterals" : "co_borrowers";
        const list = [...prev[listKey]];
        list[index] = { ...list[index], [key]: value };
        return { ...prev, [listKey]: list };
      });
    },
    [],
  );

  const addCoBorrower = useCallback(() => {
    setExtracted((prev) => (prev ? { ...prev, co_borrowers: [...prev.co_borrowers, {}] } : prev));
  }, []);

  const removeCoBorrower = useCallback((index: number) => {
    setExtracted((prev) => {
      if (!prev) return prev;
      return { ...prev, co_borrowers: prev.co_borrowers.filter((_, i) => i !== index) };
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <BaseModal open={open} onClose={handleClose} title="Import thông tin từ hồ sơ DOCX" maxWidthClassName="max-w-3xl">
      <div className="space-y-4">
        {step === "upload" && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 p-8 transition-colors hover:border-primary-400 dark:border-white/15"
            >
              <Upload className="h-8 w-8 text-zinc-400" />
              <span className="text-sm text-zinc-500">
                Kéo thả hoặc nhấn để chọn file .docx (tối đa {MAX_FILES} file)
              </span>
              <span className="text-xs text-zinc-400">BCĐX, HĐTD, PASDV, BB định giá...</span>
              <input
                ref={inputRef}
                type="file"
                accept=".docx"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs dark:border-white/10"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary-500" />
                      <span className="max-w-[200px] truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleExtract}
                  className="w-full rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:brightness-110"
                >
                  Trích xuất thông tin ({files.length} file)
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <span className="text-sm text-zinc-500">AI đang trích xuất từ {files.length} file...</span>
            <span className="text-xs text-zinc-400">Có thể mất 10-30 giây</span>
          </div>
        )}

        {step === "review" && extracted && (
          <CustomerDocxImportReviewStep
            extracted={extracted}
            duplicateWarning={duplicateWarning}
            error={error}
            submitting={submitting}
            onUpdateField={updateField}
            onAddCoBorrower={addCoBorrower}
            onRemoveCoBorrower={removeCoBorrower}
            onBack={reset}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </BaseModal>
  );
}
