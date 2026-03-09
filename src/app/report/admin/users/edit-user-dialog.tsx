"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

type EditUserDialogProps = {
  userId: string;
  currentEmail: string;
  userName: string;
  onClose: () => void;
  onUpdated: () => void;
};

export function EditUserDialog({ userId, currentEmail, userName, onClose, onUpdated }: EditUserDialogProps) {
  const [email, setEmail] = useState(currentEmail);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, string> = { userId };
    if (email !== currentEmail) body.email = email;
    if (newPassword) body.newPassword = newPassword;

    if (!body.email && !body.newPassword) {
      setError("No changes to save");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/user/admin-manage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to update");
      return;
    }

    onUpdated();
    onClose();
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-slate-100";

  return (
    <tr>
      <td colSpan={5} className="px-4 py-3 bg-slate-50 dark:bg-white/[0.02]">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600 dark:text-slate-300">
              Edit: {userName}
            </span>
            <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                New Password (leave blank to keep)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
          </button>
        </form>
      </td>
    </tr>
  );
}
