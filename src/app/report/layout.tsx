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
  Play,
  Globe,
  ChevronRight,
} from "lucide-react";

import { useLanguage } from "@/components/language-provider";

const SIDEBAR_COLLAPSED = 64;
const SIDEBAR_EXPANDED = 260;

const sidebarSpring = { type: "spring", stiffness: 300, damping: 30 } as const;

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const isMappingPage = pathname.startsWith("/report/mapping");
  const [hovered, setHovered] = useState(false);

  const links = [
    { href: "/report/mapping", label: t("nav.mapping"), icon: PenLine },
    { href: "/report/template", label: t("nav.template"), icon: FileText },
    { href: "/report/customers", label: t("nav.customers"), icon: Users },
    { href: "/report/runs", label: t("nav.runs"), icon: Play },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* ── Sidebar ── */}
      <motion.aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={{ width: hovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
        transition={sidebarSpring}
        className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/60 bg-white/80 backdrop-blur-xl"
        style={{ willChange: "width" }}
      >
        {/* Shadow overlay when expanded */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute inset-0 rounded-r-2xl shadow-xl"
              style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.08)" }}
            />
          )}
        </AnimatePresence>

        {/* Brand / Title */}
        <div className="relative flex h-16 shrink-0 items-center overflow-hidden border-b border-slate-200/60 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
            <ChevronRight className="h-4 w-4 text-white" />
          </div>
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ delay: 0.06, duration: 0.18 }}
                className="ml-3 min-w-0"
              >
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {t("report.frameworkTitle")}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {t("report.frameworkDesc")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Suggestion — hero CTA */}
        <div className="px-2 pt-4 pb-2">
          <button
            type="button"
            onClick={() => {
              if (isMappingPage) {
                window.dispatchEvent(new CustomEvent("mapping:open-ai-suggestion"));
                return;
              }
              router.push("/report/mapping?openAiSuggestion=1");
            }}
            className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-white shadow-glow transition-all duration-200 hover:shadow-glow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
            title={t("mapping.aiSuggest.button")}
          >
            <Bot className="h-5 w-5 shrink-0" />
            <AnimatePresence>
              {hovered && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ delay: 0.08, duration: 0.16 }}
                  className="truncate text-sm font-medium"
                >
                  {t("mapping.aiSuggest.button")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-zinc-600 hover:bg-slate-100/60 hover:text-zinc-900"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-indigo-600" : "text-zinc-400 group-hover:text-zinc-600"
                  }`}
                />
                <AnimatePresence>
                  {hovered && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ delay: 0.08, duration: 0.16 }}
                      className="truncate"
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Language toggle at bottom */}
        <div className="shrink-0 border-t border-slate-200/60 px-2 py-3">
          <button
            type="button"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-slate-100/60 hover:text-zinc-900"
          >
            <Globe className="h-5 w-5 shrink-0 text-zinc-400" />
            <AnimatePresence>
              {hovered && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ delay: 0.08, duration: 0.16 }}
                  className="truncate"
                >
                  {locale === "vi" ? "English" : "Tiếng Việt"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* ── Main content ── */}
      <main
        className="min-h-screen transition-[margin] duration-200"
        style={{ marginLeft: SIDEBAR_COLLAPSED }}
      >
        <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
