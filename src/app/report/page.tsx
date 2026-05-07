"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Building2, Banknote, Receipt, ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Stats = { customerCount: number; loanCount: number; invoicePendingCount: number };

const MODULE_CARDS = [
  { href: "/report/khcn", label: "Hồ sơ KHCN", desc: "Khách hàng cá nhân", icon: Users },
  { href: "/report/khdn", label: "Hồ sơ KHDN", desc: "Khách hàng doanh nghiệp", icon: Building2 },
  { href: "/report/loans", label: "Tài chính", desc: "Khoản vay", icon: Banknote },
  { href: "/report/invoices", label: "Chứng từ", desc: "Giải ngân", icon: Receipt },
] as const;

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setStats(d.stats); })
      .catch(() => {});
  }, []);

  const userName = session?.user?.name || "bạn";
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      {/* Hero greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary-600 dark:text-primary-400">
          Xin chào, {userName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Khách hàng" value={stats?.customerCount} />
        <StatCard label="Khoản vay" value={stats?.loanCount} />
        <StatCard label="Chứng từ chờ" value={stats?.invoicePendingCount} />
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-2 gap-4">
        {MODULE_CARDS.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group relative overflow-hidden rounded-2xl border border-primary-100 dark:border-primary-500/10 bg-gradient-to-br from-primary-50/80 via-white to-primary-50/60 dark:from-primary-900/30 dark:via-[#161616] dark:to-primary-900/20 p-5 transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/10 hover:border-primary-200 dark:hover:border-primary-500/20 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-500 text-white shadow-sm shadow-primary-500/25">
                <m.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-slate-100">{m.label}</p>
                <p className="text-xs text-zinc-500 dark:text-slate-400">{m.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-300 dark:text-slate-600 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary-500" />
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-zinc-400 dark:text-slate-500 pt-4">
        Loankit v0.3 · Agribank
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-primary-100 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-5 text-center shadow-sm">
      <p className="text-3xl font-bold tracking-tight text-primary-600 dark:text-primary-400">
        {value !== undefined ? value : "–"}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
