"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, UserPlus, Trash2, Pencil, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/components/language-provider";
import { EditUserDialog } from "./edit-user-dialog";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned?: boolean;
  createdAt: string;
};

/** Admin-only user management panel */
export function AdminUsersTab() {
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await authClient.admin.listUsers({ query: { limit: 100 } });
    if (result.data) {
      setUsers(
        result.data.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role ?? "viewer",
          banned: u.banned ?? false,
          createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "",
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user.role === "admin") fetchUsers();
  }, [session, fetchUsers]);

  if (!session || session.user.role !== "admin") {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-12 text-center">
        <Shield className="mx-auto h-6 w-6 text-zinc-300 dark:text-slate-600" />
        <p className="mt-2 text-sm text-zinc-400 dark:text-slate-500">{t("auth.admin")} only</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-end">
        <button type="button" onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700">
          <UserPlus className="h-3.5 w-3.5" />
          {showCreateForm ? "Cancel" : "Create User"}
        </button>
      </div>

      {showCreateForm && <CreateUserForm onCreated={() => { setShowCreateForm(false); fetchUsers(); }} />}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">Email</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">Role</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-400">Created</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} currentUserId={session.user.id} onUpdated={fetchUsers} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRow({ user, currentUserId, onUpdated }: { user: UserRecord; currentUserId: string; onUpdated: () => void }) {
  const isSelf = user.id === currentUserId;
  const [editing, setEditing] = useState(false);

  async function toggleRole() {
    const cycle: Record<string, string> = { admin: "editor", editor: "viewer", viewer: "admin" };
    const newRole = cycle[user.role] ?? "viewer";
    await authClient.admin.setRole({ userId: user.id, role: newRole as "admin" });
    onUpdated();
  }

  async function removeUser() {
    if (!confirm(`Remove ${user.name} (${user.email})?`)) return;
    await authClient.admin.removeUser({ userId: user.id });
    onUpdated();
  }

  const roleBadgeClass =
    user.role === "admin"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
      : user.role === "editor"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
        : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400";

  return (
    <>
      <tr className="border-b border-slate-100 last:border-0 dark:border-white/[0.04]">
        <td className="px-4 py-2.5 text-zinc-900 dark:text-slate-200">{user.name}</td>
        <td className="px-4 py-2.5 text-zinc-500 dark:text-slate-400">{user.email}</td>
        <td className="px-4 py-2.5">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClass}`}>
            {user.role}
          </span>
        </td>
        <td className="px-4 py-2.5 text-zinc-400 dark:text-slate-500">{user.createdAt}</td>
        <td className="px-4 py-2.5 text-right">
          {!isSelf && (
            <div className="flex items-center justify-end gap-1">
              <button type="button" onClick={toggleRole}
                className="rounded px-2 py-1 text-[10px] font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10">
                {user.role === "admin" ? "→ editor" : user.role === "editor" ? "→ viewer" : "→ admin"}
              </button>
              <button type="button" onClick={() => setEditing(!editing)}
                className="rounded p-1 text-zinc-400 hover:bg-slate-100 hover:text-zinc-600 dark:hover:bg-white/[0.06]">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={removeUser}
                className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </td>
      </tr>
      {editing && (
        <EditUserDialog userId={user.id} currentEmail={user.email} userName={user.name}
          onClose={() => setEditing(false)} onUpdated={onUpdated} />
      )}
    </>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await authClient.admin.createUser({ name, email, password, role: role as "admin" });
    setLoading(false);
    if (result.error) { setError(result.error.message || "Failed to create user"); return; }
    onCreated();
  }

  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-400 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-slate-100";

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Password</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={loading} className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50">
        {loading ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
