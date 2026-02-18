"use client";

import Link from "next/link";

import LanguageToggle from "@/components/language-toggle";
import { useLanguage } from "@/components/language-provider";

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const links = [
    { href: "/report/mapping", label: t("nav.mapping") },
    { href: "/report/template", label: t("nav.template") },
    { href: "/report/customers", label: t("nav.customers") },
    { href: "/report/runs", label: t("nav.runs") },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">{t("report.frameworkTitle")}</h1>
            <p className="text-sm text-zinc-600">{t("report.frameworkDesc")}</p>
          </div>
          <nav className="flex items-center gap-3">
            <LanguageToggle />
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
