"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, FileText, Trash2, Sparkles } from "lucide-react";
import { useXlsxLoanPlanImport } from "@/lib/hooks/use-xlsx-loan-plan-import";
import { XlsxImportButton, XlsxImportPreviewModal } from "@/components/loan-plan/xlsx-import-preview-modal";
import { XlsxSampleDropdown } from "@/components/loan-plan/xlsx-sample-dropdown";

type LoanPlan = {
  id: string;
  name: string;
  loan_method: string;
  status: string;
  financials_json: string;
  createdAt: string;
};

import { fmtDisplay } from "@/lib/invoice-tracking-format-helpers";
import { METHOD_LABELS } from "@/lib/loan-plan/loan-plan-constants";

type Financials = { totalCost: number; revenue: number; profit: number; loanAmount: number };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-brand-50 text-brand-600 ring-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
};

function fmtVND(n: number) { return fmtDisplay(n) + "đ"; }

export default function LoanPlansListPage() {
  const { id: customerId } = useParams() as { id: string };

  const [plans, setPlans] = useState<LoanPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const xlsxImport = useXlsxLoanPlanImport(customerId);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/loan-plans?customerId=${customerId}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setPlans(data.plans ?? []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(planId: string) {
    if (!confirm("Xóa phương án này?")) return;
    await fetch(`/api/loan-plans/${planId}`, { method: "DELETE" });
    void load();
  }

  /** Upload XLSX → AI analyze → create new loan plan → reload */
  async function handleAiAnalyze(file: File) {
    setAiAnalyzing(true);
    setAiError(null);
    try {
      // Step 1: Create a draft plan
      const createRes = await fetch("/api/loan-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, name: "AI đang phân tích...", costItems: [], revenueItems: [] }),
      });
      const createData = await createRes.json();
      if (!createData.ok) throw new Error(createData.error || "Không tạo được PA");
      const newPlanId = createData.plan?.id;

      // Step 2: AI analyze
      const formData = new FormData();
      formData.append("xlsxFile", file);
      const aiRes = await fetch(`/api/loan-plans/${newPlanId}/ai-analyze`, { method: "POST", body: formData });
      const aiData = await aiRes.json();
      if (!aiData.ok) throw new Error(aiData.error || "AI phân tích thất bại");

      // Step 3: Save AI results to the plan
      await fetch(`/api/loan-plans/${newPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: aiData.name || "Phương án (AI)",
          loanAmount: aiData.loanAmount,
          costItems: aiData.costItems,
          revenueItems: aiData.revenueItems,
        }),
      });

      void load();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI phân tích thất bại");
    } finally {
      setAiAnalyzing(false);
      if (aiInputRef.current) aiInputRef.current.value = "";
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/report/customers/${customerId}`} className="inline-flex items-center gap-1 text-sm text-brand-500 dark:text-brand-400 hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Quay lại</Link>
          <h2 className="text-lg font-bold text-brand-600 dark:text-brand-400">
            Phương án vay vốn
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <XlsxSampleDropdown />
          <XlsxImportButton onFileSelect={xlsxImport.uploadFile} isUploading={xlsxImport.isUploading} />
          {/* AI Analyze button */}
          <input type="file" accept=".xlsx,.xls" className="hidden" ref={aiInputRef}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleAiAnalyze(f); }} />
          <button
            type="button"
            disabled={aiAnalyzing}
            onClick={() => aiInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 dark:border-brand-500/20 bg-brand-100 dark:bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {aiAnalyzing ? "AI đang phân tích..." : "Phân tích AI"}
          </button>
          <Link
            href={`/report/customers/${customerId}/loan-plans/new`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/25 hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Tạo PA mới
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
          <p className="text-sm text-zinc-400">Chưa có phương án nào</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {plans.map((p) => {
            const fin: Financials = JSON.parse(p.financials_json || "{}");
            return (
              <div key={p.id} className="group rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-500 shrink-0" />
                      <h3 className="truncate font-semibold">{p.name || "Phương án chưa đặt tên"}</h3>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[p.status] ?? STATUS_STYLES.draft}`}>
                        {p.status === "approved" ? "Đã duyệt" : "Nháp"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{METHOD_LABELS[p.loan_method] ?? p.loan_method}</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500 shrink-0">
                    {fin.loanAmount ? <p className="font-medium text-sm text-zinc-700 dark:text-zinc-300">{fmtVND(fin.loanAmount)}</p> : null}
                    {fin.profit ? <p className={fin.profit > 0 ? "text-emerald-600" : "text-red-500"}>LN: {fmtVND(fin.profit)}</p> : null}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 dark:border-white/[0.05] pt-3">
                  <Link
                    href={`/report/customers/${customerId}/loan-plans/${p.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-100 dark:bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-100"
                  >
                    Chỉnh sửa →
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" /> Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI analyze error */}
      {aiError && (
        <div className="rounded-lg bg-brand-100 dark:bg-brand-500/10 p-3 text-sm text-brand-600 dark:text-brand-400">
          {aiError}
          <button type="button" onClick={() => setAiError(null)} className="ml-2 underline">Đóng</button>
        </div>
      )}

      {/* XLSX import error */}
      {xlsxImport.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          {xlsxImport.error}
          <button type="button" onClick={xlsxImport.resetImport} className="ml-2 underline">Đóng</button>
        </div>
      )}

      {/* XLSX import preview modal */}
      {xlsxImport.parseResult && (
        <XlsxImportPreviewModal
          open={xlsxImport.showPreview}
          onClose={xlsxImport.resetImport}
          parseResult={xlsxImport.parseResult}
          isSaving={xlsxImport.isSaving}
          onConfirm={async (payload) => {
            const ok = await xlsxImport.confirmImport(payload);
            if (ok) void load();
          }}
        />
      )}
    </section>
  );
}
