"use client";

// Section đánh giá tín dụng — 6 textarea fields + AI auto-fill

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { CostItem } from "./cost-items-table";
import type { RevenueItem } from "./loan-plan-editor-types";

type CreditAssessmentSectionProps = {
  planId: string;
  planName: string;
  costItems: CostItem[];
  revenueItems: RevenueItem[];
  financials: Record<string, unknown>;
  legalAssessment: string;
  setLegalAssessment: (v: string) => void;
  marketInput: string;
  setMarketInput: (v: string) => void;
  marketOutput: string;
  setMarketOutput: (v: string) => void;
  laborCapability: string;
  setLaborCapability: (v: string) => void;
  machineryCapability: string;
  setMachineryCapability: (v: string) => void;
  otherFactors: string;
  setOtherFactors: (v: string) => void;
};

export function CreditAssessmentSection({
  planId, planName, costItems, revenueItems, financials,
  legalAssessment, setLegalAssessment,
  marketInput, setMarketInput,
  marketOutput, setMarketOutput,
  laborCapability, setLaborCapability,
  machineryCapability, setMachineryCapability,
  otherFactors, setOtherFactors,
}: CreditAssessmentSectionProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function handleAiFill() {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch(`/api/loan-plans/${planId}/ai-credit-assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: planName, costItems, revenueItems, financials }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "AI phân tích thất bại");
      const a = data.assessment;
      if (a.legal) setLegalAssessment(a.legal);
      if (a.marketInput) setMarketInput(a.marketInput);
      if (a.marketOutput) setMarketOutput(a.marketOutput);
      if (a.labor) setLaborCapability(a.labor);
      if (a.machinery) setMachineryCapability(a.machinery);
      if (a.other) setOtherFactors(a.other);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Lỗi AI");
    } finally {
      setAiLoading(false);
    }
  }

  const fields: { label: string; sub?: string; value: string; set: (v: string) => void; placeholder: string }[] = [
    { label: "Cơ sở pháp lý", sub: "Xem xét, đánh giá cơ sở pháp lý của dự án", value: legalAssessment, set: setLegalAssessment, placeholder: "VD: Khách hàng có giấy CN QSDĐ, HĐ thi công hợp lệ..." },
    { label: "Thị trường đầu vào", sub: "Phân tích nguồn nguyên vật liệu", value: marketInput, set: setMarketInput, placeholder: "VD: Nguồn cung vật tư nông nghiệp tại địa phương dồi dào..." },
    { label: "Thị trường tiêu thụ SP", sub: "Phân tích thị trường đầu ra", value: marketOutput, set: setMarketOutput, placeholder: "VD: Sản phẩm có thị trường tiêu thụ ổn định..." },
    { label: "Năng lực về nhân công", sub: "Đánh giá nguồn nhân lực", value: laborCapability, set: setLaborCapability, placeholder: "VD: KH có kinh nghiệm, sử dụng nhân công tại chỗ..." },
    { label: "Năng lực về máy móc, công nghệ", sub: "Đánh giá trang thiết bị", value: machineryCapability, set: setMachineryCapability, placeholder: "VD: Đầu tư nhà kính hiện đại, hệ thống tưới tự động..." },
    { label: "Các yếu tố khác", sub: "Rủi ro, điều kiện tự nhiên, v.v.", value: otherFactors, set: setOtherFactors, placeholder: "VD: Rủi ro thời tiết được giảm thiểu nhờ nhà kính..." },
  ];

  return (
    <div className="rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-white dark:bg-[#161616] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Đánh giá phương án / dự án</h3>
        <button
          type="button"
          onClick={handleAiFill}
          disabled={aiLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {aiLoading ? "Đang phân tích..." : "Phân tích bằng AI"}
        </button>
      </div>
      {aiError && <p className="text-xs text-red-500 mb-3">{aiError}</p>}
      <div className="space-y-4">
        {fields.map((f) => (
          <label key={f.label} className="block">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{f.label}</span>
              {f.sub && <span className="text-[10px] text-zinc-400">{f.sub}</span>}
            </div>
            <textarea
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              rows={2}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
