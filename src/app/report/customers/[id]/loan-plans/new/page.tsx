"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { inputCls } from "@/components/invoice-tracking/form-styles";
import { METHOD_OPTIONS, CATEGORY_LABELS } from "@/lib/loan-plan/loan-plan-constants";
import { SmartField } from "@/components/smart-field";

type Template = { id: string; name: string; category: string; description: string | null };

export default function NewLoanPlanPage() {
  const { id: customerId } = useParams() as { id: string };
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [name, setName] = useState("");
  const [loanMethod, setLoanMethod] = useState("tung_lan");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/loan-plans/templates").then((r) => r.json()).then((d) => {
      if (d.ok) setTemplates(d.templates ?? []);
    });
  }, []);

  // Memoize grouped templates to avoid recalculation on every render
  const grouped = useMemo(() => templates.reduce<Record<string, Template[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {}), [templates]);

  async function handleCreate() {
    setCreating(true);
    setError("");
    const res = await fetch("/api/loan-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        templateId: selectedTemplate || undefined,
        name: name.trim() || undefined,
        loan_method: loanMethod,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!data.ok) { setError(data.error ?? "Lỗi tạo PA"); return; }
    router.push(`/report/customers/${customerId}/loan-plans/${data.plan.id}`);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/report/customers/${customerId}/loan-plans`} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">← Danh sách PA</Link>
        <h2 className="text-lg font-bold bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
          Tạo phương án mới
        </h2>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="max-w-2xl space-y-5">
        {/* Name + method */}
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Tên phương án</span>
            <SmartField fieldKey="loan_plan_name" value={name} onChange={(val) => setName(val)} className={`mt-1 ${inputCls}`} placeholder="VD: PA trồng 6 sào hoa Cát tường" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Phương thức cho vay</span>
            <select value={loanMethod} onChange={(e) => setLoanMethod(e.target.value)} className={`mt-1 ${inputCls}`}>
              {METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>

        {/* Template picker */}
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Chọn mẫu PA (tuỳ chọn)</h3>
          {templates.length === 0 ? (
            <p className="text-xs text-zinc-400">Chưa có mẫu PA. Có thể tạo PA trống.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, tpls]) => (
                <div key={cat}>
                  <p className="text-xs font-medium text-zinc-500 mb-1.5">{CATEGORY_LABELS[cat] ?? cat}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tpls.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplate(selectedTemplate === t.id ? "" : t.id)}
                        className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                          selectedTemplate === t.id
                            ? "border-violet-400 bg-violet-50 dark:bg-violet-500/10 dark:border-violet-500/40"
                            : "border-zinc-200 dark:border-white/[0.07] hover:border-violet-200 dark:hover:border-violet-500/20"
                        }`}
                      >
                        <p className="font-medium">{t.name}</p>
                        {t.description && <p className="mt-0.5 text-xs text-zinc-500">{t.description}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 hover:brightness-110 disabled:opacity-60"
        >
          {creating ? "Đang tạo..." : "Tạo phương án"}
        </button>
      </div>
    </section>
  );
}
