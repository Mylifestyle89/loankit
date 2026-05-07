"use client";

import { useEffect, useState } from "react";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";
import { BranchListSection } from "./customer-branch-list-section";
import { StaffSection, StaffData } from "./customer-staff-section";

/* ── Main Export ── */

export function CustomerBranchStaffSection() {
  const [subTab, setSubTab] = useState<"branch" | "staff">("branch");
  const [loading, setLoading] = useState(true);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [staffData, setStaffData] = useState<StaffData>({
    relationship_officer: "",
    appraiser: "",
    approver_name: "",
    approver_title: "",
  });

  // Load global config on mount
  useEffect(() => {
    fetch("/api/config/branch-staff")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.config) {
          setActiveBranchId(d.config.active_branch_id);
          setStaffData({
            relationship_officer: d.config.relationship_officer ?? "",
            appraiser: d.config.appraiser ?? "",
            approver_name: d.config.approver_name ?? "",
            approver_title: d.config.approver_title ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-primary-500 dark:text-primary-400 bg-primary-100 dark:bg-primary-500/10 rounded-lg px-3 py-2">
        Thay đổi ở đây sẽ áp dụng cho tất cả khách hàng.
      </p>
      <div className="flex gap-1">
        {([
          { key: "branch" as const, label: "Chi nhánh/PGD" },
          { key: "staff" as const, label: "Bộ phận làm hồ sơ" },
        ]).map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setSubTab(st.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              subTab === st.key
                ? "bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400"
                : "text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {subTab === "branch" && (
        <BranchListSection
          activeBranchId={activeBranchId}
          onActiveBranchChange={setActiveBranchId}
        />
      )}

      {subTab === "staff" && (
        <DropdownOptionsProvider prefix="branch.">
          <StaffSection key={JSON.stringify(staffData)} initial={staffData} />
        </DropdownOptionsProvider>
      )}
    </div>
  );
}
