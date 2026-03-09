"use client";

import { useState } from "react";
import { UserCog, Shield } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/components/language-provider";
import { AccountSettingsTab } from "./account-settings-tab";
import { AdminUsersTab } from "./admin-users-tab";

export default function UsersPage() {
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";
  const [activeTab, setActiveTab] = useState<"account" | "admin">("account");

  const tabs = [
    { key: "account" as const, label: t("auth.account"), icon: UserCog },
    ...(isAdmin ? [{ key: "admin" as const, label: t("auth.users"), icon: Shield }] : []),
  ];

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-500/10 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/30 dark:via-[#141414] dark:to-violet-950/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-200/30 blur-2xl dark:bg-indigo-500/10" />
        <div className="relative">
          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-700 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
            {t("auth.users")}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
            {isAdmin ? "Quản lý tài khoản cá nhân và người dùng hệ thống" : "Quản lý tài khoản cá nhân"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="relative mt-4 flex gap-1 rounded-lg bg-white/60 dark:bg-white/[0.04] p-1 border border-indigo-100/60 dark:border-white/[0.06] w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white dark:bg-white/[0.08] text-indigo-700 dark:text-indigo-400 shadow-sm"
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
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm p-5">
        {activeTab === "account" && <AccountSettingsTab />}
        {activeTab === "admin" && isAdmin && <AdminUsersTab />}
      </div>
    </section>
  );
}
