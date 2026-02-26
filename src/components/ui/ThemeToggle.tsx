"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useTheme } from "@/components/theme-provider";

type ThemeToggleProps = {
  expanded?: boolean;
};

export function ThemeToggle({ expanded = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex w-full items-center rounded-lg py-1.5 text-xs font-medium text-zinc-400 transition-all duration-150 hover:bg-slate-100/70 hover:text-zinc-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300 ${
        expanded ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
      }`}
    >
      <span className="relative flex h-[17px] w-[17px] shrink-0 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="h-[17px] w-[17px]" />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="h-[17px] w-[17px]" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <AnimatePresence>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ delay: 0.07, duration: 0.14 }}
            className="truncate"
          >
            {isDark ? "Light mode" : "Dark mode"}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
