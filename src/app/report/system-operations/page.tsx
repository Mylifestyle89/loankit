"use client";

import { useState } from "react";
import { Settings, Database, UserCog, Package } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { authClient } from "@/lib/auth-client";
import { DataManagementTab } from "./data-management-tab";
import { LoanProductsTab } from "./loan-products-tab";
import { AccountSettingsTab } from "../users/account-settings-tab";
import { AdminUsersTab } from "../users/admin-users-tab";

export default function SystemOperationsPage() {
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";
  const [activeTab, setActiveTab] = useState<"data" | "products" | "account" | "admin">("data");

  const tabs = [
    { key: "data" as const, label: t("systemOps.title"), icon: Database },
    { key: "products" as const, label: "Sản phẩm tín dụng", icon: Package },
    { key: "account" as const, label: t("auth.account"), icon: UserCog },
    ...(isAdmin ? [{ key: "admin" as const, label: t("auth.users"), icon: Settings }] : []),
  ];

  return (
    <section className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
        <div className="relative">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
            {t("nav.systemOps")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
            {t("systemOps.description")}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="relative mt-4 flex gap-1 rounded-lg bg-white/60 dark:bg-white/[0.04] p-1 border border-violet-100/60 dark:border-white/[0.06] w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white dark:bg-white/[0.08] text-violet-700 dark:text-violet-400 shadow-sm"
                    : "text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-slate-300"
                }`}>
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "data" && <DataManagementTab />}
      {activeTab === "products" && <LoanProductsTab />}
      {activeTab === "account" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm p-5">
          <AccountSettingsTab />
        </div>
      )}
      {activeTab === "admin" && isAdmin && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm p-5">
          <AdminUsersTab />
        </div>
      )}
    </section>
  );
}
