"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, UserPlus, Trash2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/components/language-provider";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned?: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (session && session.user.role !== "admin") {
      router.push("/report/mapping");
    }
  }, [session, router]);

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
    if (session?.user.role === "admin") {
      fetchUsers();
    }
  }, [session, fetchUsers]);

  if (!session || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-slate-100">
            {t("auth.users")}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {showCreateForm ? "Cancel" : "Create User"}
        </button>
      </div>

      {showCreateForm && (
        <CreateUserForm
          onCreated={() => {
            setShowCreateForm(false);
            fetchUsers();
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
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
                <UserRow
                  key={user.id}
                  user={user}
                  currentUserId={session.user.id}
                  onUpdated={fetchUsers}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  currentUserId,
  onUpdated,
}: {
  user: UserRecord;
  currentUserId: string;
  onUpdated: () => void;
}) {
  const isSelf = user.id === currentUserId;

  async function toggleRole() {
    const newRole = user.role === "admin" ? "viewer" : "admin";
    // Better Auth client types only know "user"|"admin"; custom roles work at runtime
    await authClient.admin.setRole({ userId: user.id, role: newRole as "admin" });
    onUpdated();
  }

  async function removeUser() {
    if (!confirm(`Remove ${user.name} (${user.email})?`)) return;
    await authClient.admin.removeUser({ userId: user.id });
    onUpdated();
  }

  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-white/[0.04]">
      <td className="px-4 py-2.5 text-zinc-900 dark:text-slate-200">{user.name}</td>
      <td className="px-4 py-2.5 text-zinc-500 dark:text-slate-400">{user.email}</td>
      <td className="px-4 py-2.5">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            user.role === "admin"
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
              : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400"
          }`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-4 py-2.5 text-zinc-400 dark:text-slate-500">{user.createdAt}</td>
      <td className="px-4 py-2.5 text-right">
        {!isSelf && (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={toggleRole}
              className="rounded px-2 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              {user.role === "admin" ? "→ viewer" : "→ admin"}
            </button>
            <button
              type="button"
              onClick={removeUser}
              className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
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

    const result = await authClient.admin.createUser({
      name,
      email,
      password,
      role: role as "admin",
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message || "Failed to create user");
      return;
    }

    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-slate-100"
          >
            <option value="viewer">viewer</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
