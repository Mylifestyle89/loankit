"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Search } from "lucide-react";

type FieldCatalogItem = { field_key: string; label_vi: string; group: string; type: string };
type FieldTemplateItem = { id: string; name: string; field_catalog: FieldCatalogItem[] };

type Props = {
  fieldTemplates: FieldTemplateItem[];
  selectedFieldTemplateId: string;
  onFieldTemplateChange: (id: string) => void;
  fieldsByGroup: Record<string, FieldCatalogItem[]>;
  groups: string[];
  onCopyField: (fieldKey: string) => void;
  copyFeedback: string | null;
};

/** Standalone panel showing all available field placeholders with search and one-click copy */
export function FieldReferencePanel(props: Props) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Filter fields by search term across field_key and label_vi
  const filteredGroups = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return props.fieldsByGroup;
    const result: Record<string, FieldCatalogItem[]> = {};
    for (const [group, fields] of Object.entries(props.fieldsByGroup)) {
      const matched = fields.filter(
        (f) => f.field_key.toLowerCase().includes(term) || f.label_vi.toLowerCase().includes(term),
      );
      if (matched.length > 0) result[group] = matched;
    }
    return result;
  }, [props.fieldsByGroup, search]);

  const filteredGroupNames = useMemo(
    () => Object.keys(filteredGroups).sort((a, b) => a.localeCompare(b, "vi")),
    [filteredGroups],
  );

  const totalFields = useMemo(
    () => Object.values(filteredGroups).reduce((s, arr) => s + arr.length, 0),
    [filteredGroups],
  );

  function toggleGroup(group: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  if (props.fieldTemplates.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm">
      <h3 className="text-base font-bold tracking-tight mb-1">Bảng tham chiếu Field</h3>
      <p className="text-sm text-zinc-500 dark:text-slate-400 mb-3">
        Sao chép <code className="rounded bg-zinc-100 dark:bg-white/5 px-1 text-xs">[field_key]</code> và dán vào file Word tại vị trí cần chèn dữ liệu
      </p>

      {/* Template selector + Search */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={props.selectedFieldTemplateId}
          onChange={(e) => props.onFieldTemplateChange(e.target.value)}
          className="min-w-48 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] dark:text-slate-100 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          {props.fieldTemplates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm field..."
            className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] dark:text-slate-100 pl-9 pr-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          />
        </div>
        <span className="self-center text-xs text-zinc-400 dark:text-slate-500">{totalFields} field</span>
      </div>

      {/* Grouped field list */}
      <div className="max-h-[24rem] overflow-y-auto rounded-lg border border-zinc-100 dark:border-white/[0.05] bg-zinc-50/50 dark:bg-[#111]">
        {filteredGroupNames.map((group) => {
          const fields = filteredGroups[group] ?? [];
          const isCollapsed = collapsed.has(group);
          return (
            <div key={group}>
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-colors"
              >
                <span className="text-xs text-zinc-400">{isCollapsed ? "▶" : "▼"}</span>
                <span className="flex-1 truncate">{group}</span>
                <span className="rounded-full bg-zinc-200/70 dark:bg-white/[0.08] px-2 py-0.5 text-xs text-zinc-500 dark:text-slate-400">{fields.length}</span>
              </button>
              {!isCollapsed && fields.map((field) => (
                <div key={field.field_key} className="flex items-center gap-2 py-1.5 pl-8 pr-3 hover:bg-zinc-100/70 dark:hover:bg-white/[0.03] transition-colors group">
                  <code className="shrink-0 rounded bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0.5 text-xs font-mono text-amber-700 dark:text-amber-400">
                    [{field.field_key}]
                  </code>
                  <span className="flex-1 truncate text-sm text-zinc-600 dark:text-slate-400">{field.label_vi}</span>
                  <button
                    type="button"
                    onClick={() => props.onCopyField(field.field_key)}
                    title={`Sao chép [${field.field_key}]`}
                    className="shrink-0 rounded-md border border-zinc-200 dark:border-white/10 p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {props.copyFeedback === `[${field.field_key}]` ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        {filteredGroupNames.length === 0 && (
          <p className="p-4 text-sm text-zinc-400 dark:text-slate-500">
            {search ? "Không tìm thấy field phù hợp." : "Chưa có field nào."}
          </p>
        )}
      </div>
    </div>
  );
}
