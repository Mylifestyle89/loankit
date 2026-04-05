"use client";

import { useLanguage } from "@/components/language-provider";

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1 text-xs">
      <button
        type="button"
        onClick={() => setLocale("vi")}
        className={`rounded px-2 py-1 ${locale === "vi" ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white" : "text-zinc-700 hover:bg-amber-50"}`}
      >
        {t("lang.vi")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded px-2 py-1 ${locale === "en" ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white" : "text-zinc-700 hover:bg-amber-50"}`}
      >
        {t("lang.en")}
      </button>
    </div>
  );
}
