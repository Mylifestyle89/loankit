"use client";

import { useEffect, useState } from "react";
import { Shield, UserPlus, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Grant = {
  id: string;
  user: { id: string; name: string; email: string };
  grantedBy: { id: string; name: string };
  createdAt: string;
};

type UserOption = { id: string; name: string; email: string };

export function CustomerAccessGrantsSection({
  customerId,
  ownerName,
}: {
  customerId: string;
  ownerName?: string | null;
}) {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";

  const [grants, setGrants] = useState<Grant[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!isAdmin) return null;

  async function fetchGrants() {
    const res = await fetch(`/api/customers/${customerId}/grants`);
    const data = await res.json();
    if (data.ok) setGrants(data.grants);
  }

  async function fetchUsers() {
    const result = await authClient.admin.listUsers({ query: { limit: 100 } });
    if (result.data?.users) {
      setUsers(
        result.data.users
          .filter((u) => u.id !== session?.user?.id)
          .map((u) => ({ id: u.id, name: u.name, email: u.email })),
      );
    }
  }

  useEffect(() => {
    void Promise.all([fetchGrants(), fetchUsers()]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function handleGrant() {
    if (!selectedUserId) return;
    const res = await fetch(`/api/customers/${customerId}/grants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedUserId("");
      setError("");
      void fetchGrants();
    } else {
      setError(data.error ?? "Không thể cấp quyền");
    }
  }

  async function handleRevoke(userId: string) {
    const res = await fetch(`/api/customers/${customerId}/grants/${userId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) void fetchGrants();
  }

  const grantedIds = new Set(grants.map((g) => g.user.id));
  const availableUsers = users.filter((u) => !grantedIds.has(u.id));

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-brand-500 dark:text-brand-400" />
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-slate-300">Quản lý quyền truy cập</h3>
      </div>

      <div className="text-xs text-zinc-500 dark:text-slate-400">
        <span className="font-medium text-zinc-600 dark:text-slate-300">Owner: </span>
        {ownerName ?? "Admin"}
      </div>

      {loading ? (
        <p className="text-xs text-zinc-400">Đang tải...</p>
      ) : grants.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-slate-500">Chưa có quyền truy cập nào được cấp.</p>
      ) : (
        <div className="rounded-lg border border-zinc-100 dark:border-white/[0.05] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 dark:bg-white/[0.03]">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-slate-400">User</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-slate-400 hidden sm:table-cell">Cấp bởi</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-slate-400">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.id} className="border-t border-zinc-100 dark:border-white/[0.05]">
                  <td className="px-3 py-2">
                    <p className="font-medium text-zinc-700 dark:text-slate-300">{g.user.name}</p>
                    <p className="text-zinc-400 dark:text-slate-500">{g.user.email}</p>
                  </td>
                  <td className="px-3 py-2 text-zinc-400 dark:text-slate-500 hidden sm:table-cell">{g.grantedBy.name}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRevoke(g.user.id)}
                      className="cursor-pointer inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <X className="h-3 w-3" /> Thu hồi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-zinc-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
        >
          <option value="">Chọn user để cấp quyền...</option>
          {availableUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleGrant}
          disabled={!selectedUserId}
          className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <UserPlus className="h-3 w-3" /> Cấp quyền
        </button>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
