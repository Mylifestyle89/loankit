"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Upload, X, AlertTriangle, Check } from "lucide-react";

import { BaseModal } from "@/components/ui/base-modal";

// ─── Types ───────────────────────────────────────────────────────────────────

type ExtractedData = {
  customer: Record<string, string>;
  loans: Record<string, string | number>[];
  collaterals: Record<string, string | number>[];
};

type Step = "upload" | "processing" | "review";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  basePath: string;
};

// ─── Field labels ────────────────────────────────────────────────────────────

const CUSTOMER_LABELS: Record<string, string> = {
  customer_name: "Họ tên", customer_code: "Mã KH", cccd: "Số CCCD",
  cccd_issued_date: "Ngày cấp CCCD", cccd_issued_place: "Nơi cấp",
  date_of_birth: "Ngày sinh", gender: "Giới tính", phone: "Số ĐT",
  address: "Địa chỉ", marital_status: "Tình trạng HN",
  spouse_name: "Họ tên vợ/chồng", spouse_cccd: "CCCD vợ/chồng",
};

const LOAN_LABELS: Record<string, string> = {
  contract_number: "Số hợp đồng", loan_amount: "Số tiền vay",
  interest_rate: "Lãi suất (%)", purpose: "Mục đích vay",
  start_date: "Ngày bắt đầu", end_date: "Ngày kết thúc",
};

const COLLATERAL_LABELS: Record<string, string> = {
  name: "Tên TSBĐ", type: "Loại", certificate_serial: "Số GCN",
  land_address: "Địa chỉ thửa đất", total_value: "Giá trị (VNĐ)",
  obligation: "Nghĩa vụ bảo đảm", land_area: "Diện tích",
  land_type_1: "Loại đất", land_unit_price_1: "Đơn giá (VNĐ/m²)",
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
    setStep("upload"); setFiles([]); setExtracted(null);
    setError(""); setDuplicateWarning("");
  }

  function handleClose() { reset(); onClose(); }

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

  // ── Step 1: Upload → AI extract ──

  async function handleExtract() {
    if (files.length === 0) return;
    setStep("processing");
    setError("");

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/customers/import-docx", { method: "POST", body: fd });
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Trích xuất thất bại");

      setExtracted(data.extracted);

      // Check duplicate CCCD (non-blocking)
      const cccd = data.extracted?.customer?.cccd;
      if (cccd) {
        try {
          const checkRes = await fetch(`/api/customers?type=individual`);
          const checkData = await checkRes.json();
          if (checkData.ok) {
            const dup = (checkData.customers ?? []).find(
              (c: { cccd?: string }) => c.cccd === cccd,
            );
            if (dup) setDuplicateWarning(`CCCD "${cccd}" đã tồn tại: ${dup.customer_name}`);
          }
        } catch { /* non-blocking */ }
      }

      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
      setStep("upload");
    }
  }

  // ── Step 3: Submit → create customer + loan + collateral ──

  async function handleSubmit() {
    if (!extracted) return;
    setSubmitting(true);
    setError("");

    try {
      const c = extracted.customer;

      // 1) Create customer
      const custRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: c.customer_name || "Chưa xác định",
          customer_code: c.customer_code || `DOCX-${Date.now()}`,
          customer_type: "individual",
          cccd: c.cccd || null,
          date_of_birth: c.date_of_birth || null,
          phone: c.phone || null,
          address: c.address || null,
          data_json: {
            cccd_issued_date: c.cccd_issued_date,
            cccd_issued_place: c.cccd_issued_place,
            gender: c.gender,
            marital_status: c.marital_status,
            spouse_name: c.spouse_name,
            spouse_cccd: c.spouse_cccd,
            import_source: "docx",
          },
        }),
      });
      const custData = await custRes.json();
      if (!custData.ok) throw new Error(custData.error || "Tạo khách hàng thất bại");

      const customerId = custData.customer.id;
      const warnings: string[] = [];

      // 2) Create loans + collaterals in parallel
      const loanPromises = extracted.loans
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
              startDate: String(loan.start_date || new Date().toISOString().slice(0, 10)),
              endDate: String(loan.end_date || new Date().toISOString().slice(0, 10)),
              purpose: String(loan.purpose || ""),
            }),
          }).then((r) => r.json()),
        );

      const colPromises = extracted.collaterals
        .filter((col) => col.name)
        .map((col) =>
          fetch(`/api/customers/${customerId}/collaterals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              collateral_type: String(col.type || "qsd_dat"),
              name: String(col.name),
              total_value: Number(col.total_value) || null,
              obligation: Number(col.obligation) || null,
              properties: {
                certificate_serial: col.certificate_serial,
                land_address: col.land_address,
                land_area: col.land_area,
                land_type_1: col.land_type_1,
                land_unit_price_1: col.land_unit_price_1,
              },
            }),
          }).then((r) => r.json()),
        );

      const [loanResults, colResults] = await Promise.all([
        Promise.allSettled(loanPromises),
        Promise.allSettled(colPromises),
      ]);

      const loanFails = loanResults.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value?.ok));
      const colFails = colResults.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value?.ok));
      if (loanFails.length > 0) warnings.push(`${loanFails.length} khoản vay tạo thất bại`);
      if (colFails.length > 0) warnings.push(`${colFails.length} TSBĐ tạo thất bại`);

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

  // ── Editable field helpers ──

  function updateCustomerField(key: string, value: string) {
    setExtracted((prev) => prev ? { ...prev, customer: { ...prev.customer, [key]: value } } : prev);
  }

  function updateLoanField(index: number, key: string, value: string) {
    setExtracted((prev) => {
      if (!prev) return prev;
      const loans = [...prev.loans];
      loans[index] = { ...loans[index], [key]: value };
      return { ...prev, loans };
    });
  }

  function updateCollateralField(index: number, key: string, value: string) {
    setExtracted((prev) => {
      if (!prev) return prev;
      const collaterals = [...prev.collaterals];
      collaterals[index] = { ...collaterals[index], [key]: value };
      return { ...prev, collaterals };
    });
  }

  return (
    <BaseModal open={open} onClose={handleClose} title="Import thông tin từ hồ sơ DOCX" maxWidthClassName="max-w-3xl">
      <div className="space-y-4">
        {/* ── Upload step ── */}
        {step === "upload" && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 dark:border-white/15 p-8 cursor-pointer hover:border-amber-400 transition-colors"
            >
              <Upload className="h-8 w-8 text-zinc-400" />
              <span className="text-sm text-zinc-500">Kéo thả hoặc nhấn để chọn file .docx (tối đa {MAX_FILES} file)</span>
              <span className="text-xs text-zinc-400">BCĐX, HĐTD, PASDV, BB định giá...</span>
              <input ref={inputRef} type="file" accept=".docx" multiple className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
            </div>

            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 px-3 py-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      <span className="truncate max-w-[200px]">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)}
                        className="text-zinc-400 hover:text-red-500 cursor-pointer">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleExtract}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:brightness-110 cursor-pointer">
                  Trích xuất thông tin ({files.length} file)
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </>
        )}

        {/* ── Processing step ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <span className="text-sm text-zinc-500">AI đang trích xuất từ {files.length} file...</span>
            <span className="text-xs text-zinc-400">Có thể mất 10-30 giây</span>
          </div>
        )}

        {/* ── Review step ── */}
        {step === "review" && extracted && (
          <>
            {duplicateWarning && (
              <div className="flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto space-y-5 pr-1">
              {/* Customer info */}
              <FieldSection title="Thông tin khách hàng" labels={CUSTOMER_LABELS}
                data={extracted.customer} onChange={updateCustomerField} />

              {/* Loans */}
              {extracted.loans.map((loan, i) => (
                <FieldSection key={i} title={`Khoản vay ${extracted.loans.length > 1 ? i + 1 : ""}`}
                  labels={LOAN_LABELS} data={loan}
                  onChange={(k, v) => updateLoanField(i, k, v)} />
              ))}

              {/* Collaterals */}
              {extracted.collaterals.map((col, i) => (
                <FieldSection key={i} title={`Tài sản bảo đảm ${extracted.collaterals.length > 1 ? i + 1 : ""}`}
                  labels={COLLATERAL_LABELS} data={col}
                  onChange={(k, v) => updateCollateralField(i, k, v)} />
              ))}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={reset}
                className="rounded-lg border border-zinc-300 dark:border-white/15 px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer">
                Thử lại
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110 disabled:opacity-50 cursor-pointer">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? "Đang tạo..." : "Tạo khách hàng"}
              </button>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
}

// ─── Editable field section ──────────────────────────────────────────────────

function FieldSection({ title, labels, data, onChange }: {
  title: string;
  labels: Record<string, string>;
  data: Record<string, string | number>;
  onChange: (key: string, value: string) => void;
}) {
  const entries = Object.entries(labels).filter(([key]) => {
    const val = data[key];
    return val !== undefined && val !== "" && val !== 0;
  });

  if (entries.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">{title}</h4>
      <div className="grid gap-2">
        {entries.map(([key, label]) => (
          <label key={key} className="flex items-center gap-3">
            <span className="text-xs font-medium text-zinc-500 w-32 shrink-0">{label}</span>
            <input
              value={String(data[key] ?? "")}
              onChange={(e) => onChange(key, e.target.value)}
              className="flex-1 rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm outline-none focus:border-amber-300 dark:focus:border-amber-500/30"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
