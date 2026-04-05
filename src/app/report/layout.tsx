"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Users,
  Globe,
  ChevronRight,
  Home,
  Settings,
  Banknote,
  Receipt,
  BookOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/invoice-tracking/notification-bell";
import { CustomerContextIndicator } from "@/components/customer-context-indicator";
import { GlobalModalProvider } from "./khdn/mapping/components/global-modal-provider";
import { authClient } from "@/lib/auth-client";
import { useCustomerData } from "@/hooks/use-customer-data";

const SIDEBAR_COLLAPSED = 48;
const SIDEBAR_EXPANDED = 240;

const sidebarSpring = { type: "spring", stiffness: 320, damping: 32 } as const;

/** Shared CSS classes for sidebar label fade-in via CSS transition (replaces AnimatePresence) */
const labelTransitionBase = "truncate transition-all duration-150 ease-out";
const labelVisible = "opacity-100 translate-x-0 w-auto";
const labelHidden = "opacity-0 -translate-x-1 pointer-events-none w-0 overflow-hidden";

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { data: session } = authClient.useSession();
  useCustomerData(); // Populate shared customer store once for all tabs

  // Detect mobile viewport (<768px) to avoid Framer Motion inline style conflicts
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  const links = [
    { href: "/report", label: "Trang chủ", icon: Home },
    { href: "/report/khcn", label: "Hồ sơ KHCN", icon: Users },
    { href: "/report/khdn", label: "Hồ sơ KHDN", icon: Building2 },
    { href: "/report/loans", label: t("nav.loans"), icon: Banknote },
    { href: "/report/invoices", label: t("nav.invoices"), icon: Receipt },
    { href: "/report/system-operations", label: t("nav.systemOps"), icon: Settings },
    { href: "/report/guide", label: t("nav.guide"), icon: BookOpen },
  ];

  const expanded = hovered || mobileOpen;
  const labelCls = `${labelTransitionBase} ${expanded ? labelVisible : labelHidden}`;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#0a0a0a] dark:text-slate-100">

      {/* ── Mobile hamburger button — visible only below md ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 shadow-md backdrop-blur-sm dark:bg-[#1a1a1a]/90 md:hidden"
      >
        <Menu className="h-5 w-5 text-zinc-700 dark:text-slate-300" />
      </button>

      {/* ── Mobile backdrop ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.aside
        onMouseEnter={() => !isMobile && setHovered(true)}
        onMouseLeave={() => !isMobile && setHovered(false)}
        animate={
          isMobile
            ? { x: mobileOpen ? 0 : "-100%", width: SIDEBAR_EXPANDED }
            : { width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }
        }
        transition={sidebarSpring}
        className="fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-zinc-100/80 bg-white/95 backdrop-blur-2xl dark:border-white/[0.05] dark:bg-[#141414]/95 max-md:z-50 max-md:shadow-2xl"
        style={{ willChange: isMobile ? "transform" : "width" }}
      >
        {/* Shadow when expanded — pure CSS instead of AnimatePresence */}
        <div
          className={`pointer-events-none absolute inset-0 rounded-r-2xl transition-opacity duration-150 ${hovered ? "opacity-100" : "opacity-0"}`}
          style={{ boxShadow: "6px 0 28px rgba(99,102,241,0.06), 2px 0 8px rgba(0,0,0,0.05)" }}
        />

        {/* ── Brand + mobile close ── */}
        <div className="relative flex h-11 shrink-0 items-center overflow-hidden px-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-600 to-amber-600 shadow-sm">
            <ChevronRight className="h-3.5 w-3.5 text-white" />
          </div>
          <div className={`ml-2.5 min-w-0 ${labelTransitionBase} ${expanded ? labelVisible : labelHidden}`}>
            <p className="truncate text-xs font-semibold leading-tight text-zinc-900 dark:text-slate-100">
              {t("report.frameworkTitle")}
            </p>
            <p className="truncate text-[10px] leading-tight text-zinc-400 dark:text-slate-500">
              {t("report.frameworkDesc")}
            </p>
          </div>
          {/* Mobile close button */}
          {mobileOpen && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="ml-auto shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-slate-100/70 hover:text-zinc-700 dark:text-slate-500 dark:hover:bg-white/[0.06] md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="mx-2.5 h-px bg-slate-100 dark:bg-white/[0.06]" />

        {/* ── Selected customer indicator ── */}
        <CustomerContextIndicator expanded={expanded} />

        {/* ── Nav links ── */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
          {links.map((link) => {
            // Prefer longest matching prefix to avoid parent routes highlighting on child pages
            const isActive = pathname.startsWith(link.href)
              && !links.some((other) => other.href !== link.href && other.href.startsWith(link.href) && pathname.startsWith(other.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={!expanded ? link.label : undefined}
                className={`group relative flex items-center rounded-lg py-2 max-md:py-3 text-sm font-medium transition-all duration-150 ${
                  expanded ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
                } ${
                  isActive
                    ? "bg-orange-50/80 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                }`}
              >
                {/* Active pill indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-orange-600 dark:bg-orange-400" />
                )}
                <Icon
                  className={`h-[17px] w-[17px] shrink-0 ${
                    isActive
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-zinc-400 group-hover:text-zinc-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  }`}
                />
                <span className={`${labelCls} text-xs`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom controls: Theme + Language + Auth ── */}
        <div className="shrink-0 px-1.5 pb-2.5 pt-1">
          <div className="mx-0 mb-1.5 h-px bg-slate-100 dark:bg-white/[0.06]" />

          <NotificationBell expanded={expanded} />
          <ThemeToggle expanded={expanded} />

          <button
            type="button"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            title={!expanded ? (locale === "vi" ? "Switch to English" : "Đổi sang Tiếng Việt") : undefined}
            className={`flex w-full items-center rounded-lg py-1.5 max-md:py-2.5 text-xs font-medium text-zinc-400 transition-all duration-150 hover:bg-slate-100/70 hover:text-zinc-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300 ${
              expanded ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
            }`}
          >
            <Globe className="h-[17px] w-[17px] shrink-0 text-zinc-400 dark:text-slate-500" />
            <span className={labelCls}>
              {locale === "vi" ? "English" : "Tiếng Việt"}
            </span>
          </button>

          {/* Logout */}
          {session?.user && (
            <button
              type="button"
              onClick={() =>
                authClient.signOut({
                  fetchOptions: { onSuccess: () => router.push("/login") },
                })
              }
              title={!expanded ? t("auth.logout") : undefined}
              className={`flex w-full items-center rounded-lg py-1.5 max-md:py-2.5 text-xs font-medium text-zinc-400 transition-all duration-150 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${
                expanded ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
              }`}
            >
              <LogOut className="h-[17px] w-[17px] shrink-0" />
              <span className={labelCls}>
                {t("auth.logout")}
              </span>
            </button>
          )}
        </div>
      </motion.aside>

      {/* ── Main content ── */}
      <main className="min-h-screen ml-0 md:ml-[48px]">
        <div className="w-full px-4 py-14 md:px-5 md:py-5">
          <GlobalModalProvider>{children}</GlobalModalProvider>
        </div>
      </main>
    </div>
  );
}
