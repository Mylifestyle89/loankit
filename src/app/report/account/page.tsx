"use client";

import { useState } from "react";
import { User, Mail, Lock, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/components/language-provider";

export default function AccountPage() {
  const { t } = useLanguage();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!session?.user) return null;

  const { user } = session;
  const roleBadgeClass =
    user.role === "admin"
      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
      : user.role === "editor"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
        : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400";

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-2.5">
        <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-slate-100">
          {t("auth.account")}
        </h1>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClass}`}>
          {user.role}
        </span>
      </div>

      <div className="space-y-4">
        <ChangeNameForm currentName={user.name} />
        <ChangeEmailForm currentEmail={user.email} />
        <ChangePasswordForm />
      </div>
    </div>
  );
}

function ChangeNameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await authClient.updateUser({ name });
    setLoading(false);
    setMsg(res.error ? res.error.message || "Error" : "Updated!");
  }

  return (
    <FormCard icon={<User className="h-4 w-4" />} title="Name">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        <SubmitBtn loading={loading} disabled={name === currentName} />
      </form>
      <Msg text={msg} />
    </FormCard>
  );
}

function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await authClient.changeEmail({ newEmail: email });
    setLoading(false);
    setMsg(res.error ? res.error.message || "Error" : "Updated! Re-login may be required.");
  }

  return (
    <FormCard icon={<Mail className="h-4 w-4" />} title="Email">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
        <SubmitBtn loading={loading} disabled={email === currentEmail} />
      </form>
      <Msg text={msg} />
    </FormCard>
  );
}

function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await authClient.changePassword({ currentPassword: current, newPassword: newPw });
    setLoading(false);
    if (res.error) {
      setMsg(res.error.message || "Error");
    } else {
      setMsg("Password changed!");
      setCurrent("");
      setNewPw("");
    }
  }

  return (
    <FormCard icon={<Lock className="h-4 w-4" />} title="Password">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="password"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          minLength={8}
          className={inputClass}
        />
        <input
          type="password"
          placeholder="New password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          required
          minLength={8}
          className={inputClass}
        />
        <SubmitBtn loading={loading} disabled={!current || !newPw} label="Change Password" />
      </form>
      <Msg text={msg} />
    </FormCard>
  );
}

// Shared UI helpers
const inputClass =
  "flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-slate-100";

function FormCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-slate-300">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function SubmitBtn({ loading, disabled, label = "Save" }: { loading: boolean; disabled: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
    </button>
  );
}

function Msg({ text }: { text: string }) {
  if (!text) return null;
  const isError = !text.includes("Updated") && !text.includes("changed");
  return (
    <p className={`mt-2 text-xs ${isError ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
      {text}
    </p>
  );
}
