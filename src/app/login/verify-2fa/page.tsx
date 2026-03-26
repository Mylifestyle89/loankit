"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeCallbackUrl } from "@/lib/auth-utils";

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);

    try {
      const result = useBackup
        ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
        : await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice: true });

      if (result.error) {
        setError(useBackup ? "Mã dự phòng không đúng" : "Mã xác thực không đúng");
        return;
      }
      router.push(callbackUrl);
    } catch {
      setError("Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, useBackup ? 20 : 6));
  }

  return (
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
      <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md">
        <ShieldCheck className="h-5 w-5 text-white" />
      </div>

      <h1 className="mb-2 text-center text-xl font-semibold text-white">
        Xác thực 2 lớp
      </h1>
      <p className="mb-6 text-center text-xs text-slate-400">
        {useBackup ? "Nhập mã dự phòng của bạn" : "Nhập mã 6 số từ ứng dụng xác thực"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          inputMode={useBackup ? "text" : "numeric"}
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3 text-center text-lg font-mono tracking-[0.3em] text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
          placeholder={useBackup ? "mã dự phòng" : "000000"}
        />

        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || (!useBackup && code.length < 6)}
          className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Đang xác minh..." : "Xác minh"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setUseBackup(!useBackup); setCode(""); setError(""); }}
        className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {useBackup ? "← Dùng mã từ ứng dụng" : "Dùng mã dự phòng"}
      </button>
    </div>
  );
}

export default function Verify2FAPage() {
  return <Verify2FAForm />;
}
