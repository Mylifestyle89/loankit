"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { type Locale, messages } from "@/lib/i18n/translations";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return "vi";
    }
    const saved = window.localStorage.getItem("app_locale");
    return saved === "vi" || saved === "en" ? saved : "vi";
  });

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem("app_locale", nextLocale);
    document.documentElement.lang = nextLocale;
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: string) => messages[locale][key] ?? key,
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }
  return context;
}
