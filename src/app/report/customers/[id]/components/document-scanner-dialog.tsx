"use client";

import { useState, useRef } from "react";
import type { DocumentType } from "@/services/ocr-document-prompts";
import { DOCUMENT_TYPE_LABELS, VALID_DOCUMENT_TYPES } from "@/services/ocr-document-prompts";
import { BaseModal } from "@/components/ui/base-modal";

const MAX_FILES = 4;

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: { documentType: DocumentType; fields: Record<string, string> }) => void;
  allowedTypes?: DocumentType[];
};

type Step = "upload" | "processing" | "review";

/** Human-readable labels for extracted field keys */
const FIELD_LABELS: Record<string, string> = {
  full_name: "Họ tên", cccd_number: "Số CCCD", date_of_birth: "Ngày sinh",
  gender: "Giới tính", nationality: "Quốc tịch", place_of_origin: "Quê quán",
  place_of_residence: "Nơi thường trú", issued_date: "Ngày cấp", issued_place: "Nơi cấp",
  expiry_date: "Ngày hết hạn", certificate_number: "Số GCN", owner_name: "Chủ sở hữu",
  land_address: "Địa chỉ thửa đất", land_area_m2: "Diện tích (m²)",
  land_use_purpose: "Mục đích sử dụng", land_use_duration: "Thời hạn SD",
  book_number: "Số sổ", bank_name: "Ngân hàng", amount: "Số tiền",
  currency: "Loại tiền", term_months: "Kỳ hạn (tháng)", interest_rate: "Lãi suất",
  open_date: "Ngày mở", maturity_date: "Ngày đáo hạn",
  plate_number: "Biển số", vehicle_type: "Loại xe", brand_model: "Hãng/Model",
  color: "Màu sơn", frame_number: "Số khung", engine_number: "Số máy",
  registration_date: "Ngày đăng ký", seat_count: "Số chỗ ngồi",
  manufacture_year: "Năm sản xuất", registration_number: "Số giấy ĐK",
};

export function DocumentScannerDialog({ open, onClose, onConfirm, allowedTypes }: Props) {
  const types = allowedTypes ?? VALID_DOCUMENT_TYPES;
  const [step, setStep] = useState<Step>("upload");
  const [docType, setDocType] = useState<DocumentType>(types[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function revokeAllPreviews() {
    previews.forEach((url) => URL.revokeObjectURL(url));
  }

  function reset() {
    revokeAllPreviews();
    setStep("upload"); setFiles([]); setPreviews([]);
    setFields({}); setConfidence(0); setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  /** Add files to the list (up to MAX_FILES total) */
  function addFiles(newFiles: FileList | File[]) {
    const incoming = Array.from(newFiles).slice(0, MAX_FILES - files.length);
    if (incoming.length === 0) return;

    setError("");
    const updatedFiles = [...files, ...incoming];
    setFiles(updatedFiles);

    // Generate previews for image files
    const newPreviews = incoming
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeFile(index: number) {
    // Revoke preview if it's an image
    if (files[index]?.type.startsWith("image/") && previews.length > 0) {
      // Find which preview index corresponds (only images have previews)
      let imgIdx = 0;
      for (let i = 0; i < index; i++) {
        if (files[i]?.type.startsWith("image/")) imgIdx++;
      }
      if (previews[imgIdx]) {
        URL.revokeObjectURL(previews[imgIdx]);
        setPreviews((prev) => prev.filter((_, i) => i !== imgIdx));
      }
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (files.length === 0) return;
    setStep("processing");
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("file", f));
      fd.append("documentType", docType);
      const res = await fetch("/api/ocr/extract-document", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Extraction failed");
      setFields(data.result.fields);
      setConfidence(data.result.confidence);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
      setStep("upload");
    }
  }

  function handleConfirm() {
    onConfirm({ documentType: docType, fields });
    reset();
    onClose();
  }

  const confidenceColor = confidence >= 0.8 ? "text-emerald-600" : confidence >= 0.5 ? "text-yellow-600" : "text-red-600";

  return (
    <BaseModal open={open} onClose={handleClose} title="Scan tài liệu">
      <div className="space-y-4">
        {/* Step: Upload */}
        {step === "upload" && (
          <>
            <label className="block">
              <span className="text-sm font-medium">Loại tài liệu</span>
              <select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="mt-1 w-full rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#222] px-3 py-2 text-sm">
                {types.map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>)}
              </select>
            </label>

            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 dark:border-white/15 p-6 cursor-pointer hover:border-primary-400 transition-colors"
            >
              <span className="text-3xl">📷</span>
              <span className="text-sm text-zinc-500">Kéo thả hoặc nhấn để chọn ảnh/PDF (tối đa {MAX_FILES} file)</span>
              <input ref={inputRef} type="file" accept="image/*,application/pdf" capture="environment"
                multiple className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
            </div>

            {/* File list + previews */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 px-3 py-1.5 text-xs">
                      <span className="truncate max-w-[150px]">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)}
                        className="text-zinc-400 hover:text-red-500 text-sm">&times;</button>
                    </div>
                  ))}
                </div>
                {previews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {previews.map((url, i) => (
                      <img key={i} src={url} alt={`Preview ${i + 1}`}
                        className="h-20 rounded-lg border border-zinc-200 dark:border-white/10 object-cover" />
                    ))}
                  </div>
                )}
                <button type="button" onClick={handleSubmit}
                  className="w-full rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110">
                  Trích xuất thông tin ({files.length} file)
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
            <span className="text-sm text-zinc-500">Đang trích xuất từ {files.length} file...</span>
          </div>
        )}

        {/* Step: Review extracted fields */}
        {step === "review" && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span>Độ tin cậy:</span>
              <span className={`font-semibold ${confidenceColor}`}>{Math.round(confidence * 100)}%</span>
            </div>
            <div className="grid gap-3 max-h-80 overflow-y-auto">
              {Object.entries(fields).map(([key, val]) => (
                <label key={key} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-36 shrink-0">{FIELD_LABELS[key] || key}</span>
                  <input value={val}
                    onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="flex-1 rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#222] px-3 py-1.5 text-sm" />
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={reset}
                className="rounded-lg border border-zinc-300 dark:border-white/15 px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-white/5">
                Thử lại
              </button>
              <button onClick={handleConfirm}
                className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110">
                Điền vào form
              </button>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
}
