"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  PenLine,
  FileText,
  Users,
  Globe,
  ChevronRight,
  Settings,
  Banknote,
  Receipt,
  BookOpen,
  LogOut,
  Shield,
  UserCog,
} from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/invoice-tracking/notification-bell";
import { CustomerContextIndicator } from "@/components/customer-context-indicator";
import { GlobalModalProvider } from "./mapping/components/GlobalModalProvider";
import { authClient } from "@/lib/auth-client";
import { useCustomerData } from "@/hooks/use-customer-data";

const SIDEBAR_COLLAPSED = 48;
const SIDEBAR_EXPANDED = 240;

const sidebarSpring = { type: "spring", stiffness: 320, damping: 32 } as const;

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const isMappingPage = pathname.startsWith("/report/mapping");
  const [hovered, setHovered] = useState(false);
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";
  useCustomerData(); // Populate shared customer store once for all tabs

  const links = [
    { href: "/report/mapping", label: t("nav.mapping"), icon: PenLine },
    { href: "/report/template", label: t("nav.template"), icon: FileText },
    { href: "/report/customers", label: t("nav.customers"), icon: Users },
    { href: "/report/loans", label: t("nav.loans"), icon: Banknote },
    { href: "/report/invoices", label: t("nav.invoices"), icon: Receipt },
    { href: "/report/system-operations", label: t("nav.systemOps"), icon: Settings },
    { href: "/report/guide", label: t("nav.guide"), icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#0a0a0a] dark:text-slate-100">

      {/* ── Sidebar ── */}
      <motion.aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={{ width: hovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
        transition={sidebarSpring}
        className="fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-slate-200/50 bg-white/90 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#141414]/90"
        style={{ willChange: "width" }}
      >
        {/* Shadow when expanded */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute inset-0 rounded-r-2xl"
              style={{ boxShadow: "6px 0 28px rgba(99,102,241,0.06), 2px 0 8px rgba(0,0,0,0.05)" }}
            />
          )}
        </AnimatePresence>

        {/* ── Brand ── */}
        <div className="relative flex h-11 shrink-0 items-center overflow-hidden px-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm">
            <ChevronRight className="h-3.5 w-3.5 text-white" />
          </div>
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ delay: 0.05, duration: 0.15 }}
                className="ml-2.5 min-w-0"
              >
                <p className="truncate text-xs font-semibold leading-tight text-zinc-900 dark:text-slate-100">
                  {t("report.frameworkTitle")}
                </p>
                <p className="truncate text-[10px] leading-tight text-zinc-400 dark:text-slate-500">
                  {t("report.frameworkDesc")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="mx-2.5 h-px bg-slate-100 dark:bg-white/[0.06]" />

        {/* ── AI CTA ── */}
        <div className="px-1.5 pt-2.5 pb-1">
          <button
            type="button"
            onClick={() => {
              if (isMappingPage) {
                window.dispatchEvent(new CustomEvent("mapping:open-ai-suggestion"));
                return;
              }
              router.push("/report/mapping?openAiSuggestion=1");
            }}
            title={t("mapping.aiSuggest.button")}
            className={`group relative flex w-full items-center overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
              hovered ? "gap-2.5 px-2.5 py-2 justify-start" : "justify-center py-2"
            }`}
          >
            <Bot className="h-4 w-4 shrink-0" />
            <AnimatePresence>
              {hovered && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ delay: 0.07, duration: 0.14 }}
                  className="truncate text-xs font-medium"
                >
                  {t("mapping.aiSuggest.button")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* ── Selected customer indicator ── */}
        <CustomerContextIndicator expanded={hovered} />

        {/* ── Nav links ── */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={!hovered ? link.label : undefined}
                className={`group flex items-center rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                  hovered ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
                } ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                    : "text-zinc-500 hover:bg-slate-100/70 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`h-[17px] w-[17px] shrink-0 ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-zinc-400 group-hover:text-zinc-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  }`}
                />
                <AnimatePresence>
                  {hovered && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ delay: 0.07, duration: 0.14 }}
                      className="truncate text-xs"
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom controls: Theme + Language + Auth ── */}
        <div className="shrink-0 px-1.5 pb-2.5 pt-1">
          <div className="mx-0 mb-1.5 h-px bg-slate-100 dark:bg-white/[0.06]" />

          <NotificationBell expanded={hovered} />
          <ThemeToggle expanded={hovered} />

          <button
            type="button"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            title={!hovered ? (locale === "vi" ? "Switch to English" : "Đổi sang Tiếng Việt") : undefined}
            className={`flex w-full items-center rounded-lg py-1.5 text-xs font-medium text-zinc-400 transition-all duration-150 hover:bg-slate-100/70 hover:text-zinc-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300 ${
              hovered ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
            }`}
          >
            <Globe className="h-[17px] w-[17px] shrink-0 text-zinc-400 dark:text-slate-500" />
            <AnimatePresence>
              {hovered && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ delay: 0.07, duration: 0.14 }}
                  className="truncate"
                >
                  {locale === "vi" ? "English" : "Tiếng Việt"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Account link */}
          {session?.user && (
            <Link
              href="/report/account"
              title={!hovered ? t("auth.account") : undefined}
              className={`flex w-full items-center rounded-lg py-1.5 text-xs font-medium text-zinc-400 transition-all duration-150 hover:bg-slate-100/70 hover:text-zinc-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300 ${
                hovered ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
              }`}
            >
              <UserCog className="h-[17px] w-[17px] shrink-0 text-zinc-400 dark:text-slate-500" />
              <AnimatePresence>
                {hovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ delay: 0.07, duration: 0.14 }}
                    className="truncate"
                  >
                    {t("auth.account")}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}

          {/* Admin link */}
          {isAdmin && (
            <Link
              href="/report/admin/users"
              title={!hovered ? t("auth.users") : undefined}
              className={`flex w-full items-center rounded-lg py-1.5 text-xs font-medium text-zinc-400 transition-all duration-150 hover:bg-slate-100/70 hover:text-zinc-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300 ${
                hovered ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
              }`}
            >
              <Shield className="h-[17px] w-[17px] shrink-0 text-zinc-400 dark:text-slate-500" />
              <AnimatePresence>
                {hovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ delay: 0.07, duration: 0.14 }}
                    className="truncate"
                  >
                    {t("auth.users")}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}

          {/* User info + Logout */}
          {session?.user && (
            <button
              type="button"
              onClick={() =>
                authClient.signOut({
                  fetchOptions: { onSuccess: () => router.push("/login") },
                })
              }
              title={!hovered ? t("auth.logout") : undefined}
              className={`flex w-full items-center rounded-lg py-1.5 text-xs font-medium text-zinc-400 transition-all duration-150 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${
                hovered ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
              }`}
            >
              <LogOut className="h-[17px] w-[17px] shrink-0" />
              <AnimatePresence>
                {hovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ delay: 0.07, duration: 0.14 }}
                    className="truncate"
                  >
                    {t("auth.logout")}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </motion.aside>

      {/* ── Main content ── */}
      <main
        className="min-h-screen"
        style={{ marginLeft: SIDEBAR_COLLAPSED }}
      >
        <div className="w-full px-5 py-5">
          <GlobalModalProvider>{children}</GlobalModalProvider>
        </div>
      </main>
    </div>
  );
}
