"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, FileText, Bot, Users } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

const tabs = [
  { key: "customers", href: "/report/khdn/customers", icon: Users, labelKey: "nav.customers" },
  { key: "mapping", href: "/report/khdn/mapping", icon: PenLine, labelKey: "nav.mapping" },
  { key: "template", href: "/report/khdn/template", icon: FileText, labelKey: "nav.template" },
  { key: "ai-suggest", href: "/report/khdn/ai-suggest", icon: Bot, labelKey: "mapping.aiSuggest.button" },
] as const;

export default function KhdnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <section className="space-y-4 max-w-[1600px]">
      {/* Header with sub-tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-500/10 bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-brand-950/30 dark:via-[#242220] dark:to-brand-900/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-200/30 blur-2xl dark:bg-brand-500/10" />
        <div className="relative">
          <h2 className="text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
            Khách hàng doanh nghiệp
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
            Quản lý hồ sơ khách hàng doanh nghiệp (KHDN)
          </p>
        </div>

        {/* Tab switcher */}
        <div className="relative mt-4 flex flex-nowrap gap-1 overflow-x-auto rounded-lg bg-white/60 dark:bg-white/[0.04] p-1 border border-brand-100/60 dark:border-white/[0.06] max-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white dark:bg-white/[0.08] text-brand-600 dark:text-brand-400 shadow-sm"
                    : "text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-slate-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(tab.labelKey)}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {children}
    </section>
  );
}
