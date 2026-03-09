"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/components/language-provider";

function LoginForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Validate callbackUrl to prevent open redirect attacks
  const rawCallback = searchParams.get("callbackUrl") || "/report/mapping";
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//")
    ? rawCallback
    : "/report/mapping";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await authClient.signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message || t("login.errorGeneric"));
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
      {/* Brand icon */}
      <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md">
        <ChevronRight className="h-5 w-5 text-white" />
      </div>

      <h1 className="mb-6 text-center text-xl font-semibold text-white">
        {t("login.title")}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium text-slate-400">
            {t("login.email")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            placeholder="admin@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-medium text-slate-400">
            {t("login.password")}
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? t("login.signingIn") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-4">
      {/* Background gradients — same as landing page */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),rgba(5,5,5,0.98)_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_72%,rgba(16,185,129,0.2),transparent_34%)]" />
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
