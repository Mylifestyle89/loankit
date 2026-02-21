"use client";

import { useLanguage } from "@/components/language-provider";

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="inline-flex rounded-md border border-coral-tree-300 bg-white p-1 text-xs">
      <button
        type="button"
        onClick={() => setLocale("vi")}
        className={`rounded px-2 py-1 ${locale === "vi" ? "bg-coral-tree-700 text-white" : "text-coral-tree-700 hover:bg-coral-tree-100"}`}
      >
        {t("lang.vi")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded px-2 py-1 ${locale === "en" ? "bg-coral-tree-700 text-white" : "text-coral-tree-700 hover:bg-coral-tree-100"}`}
      >
        {t("lang.en")}
      </button>
    </div>
  );
}
