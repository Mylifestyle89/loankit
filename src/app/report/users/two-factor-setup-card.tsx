"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ShieldCheck, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { TwoFactorBackupCodes } from "./two-factor-backup-codes";

const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

type Step = "idle" | "qr" | "verify" | "backup" | "disabling";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-400 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-slate-100";
const btnClass =
  "w-full rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50";

export function TwoFactorSetupCard({ enabled }: { enabled: boolean }) {
  const [step, setStep] = useState<Step>("idle");
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(enabled);

  // Sync with parent prop if session refreshes
  useEffect(() => { setIs2FAEnabled(enabled); }, [enabled]);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authClient.twoFactor.enable({ password });
      if (res.error) { setError(res.error.message || "Mật khẩu không đúng"); return; }
      setTotpUri(res.data?.totpURI ?? "");
      setBackupCodes(res.data?.backupCodes ?? []);
      setPassword("");
      setStep("qr");
    } catch { setError("Lỗi kết nối, vui lòng thử lại");
    } finally { setLoading(false); }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authClient.twoFactor.verifyTotp({ code: verifyCode });
      if (res.error) { setError("Mã không đúng, thử lại"); return; }
      setIs2FAEnabled(true);
      setStep("backup");
    } catch { setError("Lỗi kết nối, vui lòng thử lại");
    } finally { setLoading(false); }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authClient.twoFactor.disable({ password });
      if (res.error) { setError(res.error.message || "Mật khẩu không đúng"); return; }
      setIs2FAEnabled(false);
      setPassword("");
      setStep("idle");
    } catch { setError("Lỗi kết nối, vui lòng thử lại");
    } finally { setLoading(false); }
  }

  function resetTo(s: Step) { setStep(s); setError(""); setPassword(""); setVerifyCode(""); }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-slate-300">
        <ShieldCheck className="h-4 w-4" />
        Xác thực 2 lớp (2FA)
        {is2FAEnabled && (
          <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-300">
            Đang bật
          </span>
        )}
      </div>

      {/* Idle: enable */}
      {step === "idle" && !is2FAEnabled && (
        <form onSubmit={handleEnable} className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Bảo vệ tài khoản bằng ứng dụng xác thực (Google Authenticator, Authy).</p>
          <input type="password" placeholder="Nhập mật khẩu để bật 2FA" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
          <ErrorMsg text={error} />
          <button type="submit" disabled={loading || !password} className={btnClass}>
            {loading ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Bật 2FA"}
          </button>
        </form>
      )}

      {/* Idle: already enabled */}
      {step === "idle" && is2FAEnabled && (
        <div className="space-y-2">
          <p className="text-xs text-green-600 dark:text-green-400">✓ 2FA đang hoạt động.</p>
          <button type="button" onClick={() => setStep("disabling")} className="text-xs text-red-500 hover:text-red-400 transition-colors">Tắt 2FA</button>
        </div>
      )}

      {/* Disable confirm */}
      {step === "disabling" && (
        <form onSubmit={handleDisable} className="space-y-2">
          <p className="text-xs text-red-500">Nhập mật khẩu để tắt 2FA:</p>
          <input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
          <ErrorMsg text={error} />
          <div className="flex gap-2">
            <button type="submit" disabled={loading || !password} className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Xác nhận tắt"}
            </button>
            <button type="button" onClick={() => resetTo("idle")} className="text-xs text-slate-500 hover:text-slate-300">Huỷ</button>
          </div>
        </form>
      )}

      {/* QR + verify */}
      {step === "qr" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Quét mã QR bằng Google Authenticator hoặc Authy:</p>
          <div className="flex justify-center rounded-lg bg-white p-4">
            <QRCode value={totpUri} size={180} />
          </div>
          <form onSubmit={handleVerify} className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">Nhập mã 6 số để xác minh:</p>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputClass} text-center font-mono tracking-[0.3em]`} autoFocus />
            <ErrorMsg text={error} />
            <button type="submit" disabled={loading || verifyCode.length < 6} className={btnClass}>
              {loading ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Xác minh"}
            </button>
          </form>
        </div>
      )}

      {/* Backup codes */}
      {step === "backup" && (
        <TwoFactorBackupCodes codes={backupCodes} onDone={() => resetTo("idle")} />
      )}
    </div>
  );
}

function ErrorMsg({ text }: { text: string }) {
  if (!text) return null;
  return <p role="alert" className="text-xs text-red-500">{text}</p>;
}
