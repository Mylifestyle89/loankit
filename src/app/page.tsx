"use client";

import Link from "next/link";

import LanguageToggle from "@/components/language-toggle";
import { useLanguage } from "@/components/language-provider";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <main className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-8">
        <div className="mb-5 flex justify-end">
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("home.desc")}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/report" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">
            {t("home.openWorkspace")}
          </Link>
          <Link href="/report/runs" className="rounded-md border border-zinc-300 px-4 py-2 text-sm">
            {t("home.viewRuns")}
          </Link>
        </div>
      </main>
    </div>
  );
}
