"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-provider";

export default function ReportHomePage() {
  const { t } = useLanguage();

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{t("workspace.workflow")}</h2>
      <ol className="list-decimal space-y-1 pl-6 text-sm text-zinc-700">
        <li>{t("workspace.step1")}</li>
        <li>{t("workspace.step2")}</li>
        <li>{t("workspace.step3")}</li>
      </ol>
      <div className="flex gap-3">
        <Link href="/report/mapping" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">
          {t("workspace.openMapping")}
        </Link>
        <Link href="/report/runs" className="rounded-md border border-zinc-300 px-4 py-2 text-sm">
          {t("workspace.openRuns")}
        </Link>
      </div>
    </section>
  );
}
