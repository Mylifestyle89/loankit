"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { useCustomerStore } from "../../stores/use-customer-store";

type CustomerPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customerId: string) => void;
  /** Filter customers by type (e.g. "corporate" for KHDN, "individual" for KHCN) */
  customerTypeFilter?: string;
};

export function CustomerPickerModal({ isOpen, onClose, onSelect, customerTypeFilter }: CustomerPickerModalProps) {
  const { customers, selectedCustomerId } = useCustomerStore();
  const [query, setQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setShowCreateForm(false);
      setCreating(false);
      setCreateError("");
      setNewCode("");
      setNewName("");
      setNewAddress("");
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    // Filter by customer type first (e.g. "corporate" for KHDN)
    let list = customerTypeFilter
      ? customers.filter((c) => c.customer_type === customerTypeFilter)
      : customers;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) => c.customer_name.toLowerCase().includes(q) || c.customer_code.toLowerCase().includes(q),
      );
    }
    return list;
  }, [customers, customerTypeFilter, query]);

  async function handleCreate() {
    const code = newCode.trim();
    const name = newName.trim();
    if (!code || !name) { setCreateError("Mã KH và Tên KH là bắt buộc."); return; }

    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_code: code,
          customer_name: name,
          address: newAddress.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setCreateError(data.error || "Tạo khách hàng thất bại."); return; }

      // Refresh customer list in store
      const listRes = await fetch("/api/customers");
      const listData = await listRes.json();
      if (listData.ok) useCustomerStore.getState().setCustomers(listData.customers);

      onSelect(data.customer.id);
    } catch {
      setCreateError("Lỗi kết nối server.");
    } finally {
      setCreating(false);
    }
  }

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[111] flex items-center justify-center p-4"
      >
        <div role="dialog" aria-modal="true" aria-label="Chọn khách hàng" className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#141414] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.07] px-5 py-3.5">
            <h3 className="text-base font-semibold text-zinc-800 dark:text-slate-200">Chọn khách hàng</h3>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc mã KH..."
                autoFocus
                className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-zinc-50 dark:bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-slate-100 placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              />
            </div>
          </div>

          {/* Customer list */}
          <div className="max-h-60 overflow-y-auto px-5 py-2">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500 dark:text-slate-400">Không tìm thấy khách hàng</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      c.id === selectedCustomerId
                        ? "bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300 font-medium"
                        : "text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="font-mono text-xs text-zinc-500 dark:text-slate-400 w-16 shrink-0">{c.customer_code}</span>
                    <span className="truncate">{c.customer_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider + Create toggle */}
          <div className="border-t border-zinc-200 dark:border-white/[0.07] px-5 py-3">
            {!showCreateForm ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 dark:border-white/[0.12] px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-slate-300 transition-colors hover:border-primary-400 hover:text-primary-500 dark:hover:text-primary-400"
              >
                <Plus className="h-4 w-4" />
                Tạo khách hàng mới
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-slate-300 mb-1">Mã KH *</label>
                    <input
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      maxLength={50}
                      placeholder="VD: KH001"
                      className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-zinc-50 dark:bg-white/[0.04] px-3 py-2 text-sm text-zinc-900 dark:text-slate-100 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-slate-300 mb-1">Tên KH *</label>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={200}
                      placeholder="VD: Công ty ABC"
                      className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-zinc-50 dark:bg-white/[0.04] px-3 py-2 text-sm text-zinc-900 dark:text-slate-100 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-slate-300 mb-1">Địa chỉ</label>
                  <input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    maxLength={500}
                    placeholder="Tùy chọn"
                    className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-zinc-50 dark:bg-white/[0.04] px-3 py-2 text-sm text-zinc-900 dark:text-slate-100 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                  />
                </div>
                {createError && <p className="text-xs text-rose-600 dark:text-rose-400">{createError}</p>}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#141414] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-slate-200 transition-colors hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={creating || !newCode.trim() || !newName.trim()}
                    className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-primary-500/25 transition-all hover:brightness-110 disabled:opacity-60"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Tạo & Chọn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    portalTarget,
  );
}
