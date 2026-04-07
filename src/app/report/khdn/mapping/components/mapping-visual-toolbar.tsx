import { Users, FileText, Upload, BarChart3, Settings } from "lucide-react";
import { ToolbarActionButton } from "./toolbar-action-button";

type MappingVisualToolbarProps = {
  // Action buttons
  onOpenCustomerPicker: () => void;
  onOpenTemplatePicker: () => void;
  onUploadDocument: () => void;
  onOpenFinancialAnalysis: () => void;
  onToggleSidebar: () => void;
  // Active states
  hasCustomer: boolean;
  hasTemplate: boolean;
  sidebarOpen: boolean;
  // Search/filter row
  t: (key: string) => string;
  hasContext: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  showUnmappedOnly: boolean;
  setShowUnmappedOnly: (v: boolean) => void;
  showTechnicalKeys: boolean;
  setShowTechnicalKeys: (v: boolean) => void;
};

const SEPARATOR = (
  <div className="h-6 w-px bg-zinc-200 dark:bg-white/[0.08] mx-1" />
);

export function MappingVisualToolbar({
  onOpenCustomerPicker,
  onOpenTemplatePicker,
  onUploadDocument,
  onOpenFinancialAnalysis,
  onToggleSidebar,
  hasCustomer,
  hasTemplate,
  sidebarOpen,
  t,
  hasContext,
  searchTerm,
  setSearchTerm,
  showUnmappedOnly,
  setShowUnmappedOnly,
  showTechnicalKeys,
  setShowTechnicalKeys,
}: MappingVisualToolbarProps) {
  return (
    <div className="space-y-2">
      {/* Row 1: Action buttons — center-aligned, 3 groups */}
      <div className="flex items-center justify-center gap-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#141414]/90 p-2 backdrop-blur-sm">
        {/* Group 1: Context — Customer + Template */}
        <ToolbarActionButton
          icon={<Users className="h-5 w-5" />}
          label="Khách hàng"
          tooltip="Chọn khách hàng để load dữ liệu field tương ứng"
          onClick={onOpenCustomerPicker}
          active={hasCustomer}
        />
        <ToolbarActionButton
          icon={<FileText className="h-5 w-5" />}
          label="Mẫu dữ liệu"
          tooltip="Chọn mẫu mapping (bộ field) để áp dụng cho khách hàng"
          onClick={onOpenTemplatePicker}
          active={hasTemplate}
        />

        {SEPARATOR}

        {/* Group 2: Processing — Upload + Financial */}
        <ToolbarActionButton
          icon={<Upload className="h-5 w-5" />}
          label="Upload OCR"
          tooltip="Upload tài liệu (DOCX, PDF, ảnh) để AI trích xuất và tự điền dữ liệu vào các field"
          onClick={onUploadDocument}
        />
        <ToolbarActionButton
          icon={<BarChart3 className="h-5 w-5" />}
          label="Tài chính"
          tooltip="Phân tích dữ liệu tài chính của khách hàng (cần chọn khách hàng trước)"
          onClick={onOpenFinancialAnalysis}
          disabled={!hasCustomer}
        />

        {SEPARATOR}

        {/* Group 3: Settings — Sidebar */}
        <ToolbarActionButton
          icon={<Settings className="h-5 w-5" />}
          label="Thêm"
          tooltip="Mở panel tiện ích: nối nhóm, backup, nối DOCX, import/export dữ liệu"
          onClick={onToggleSidebar}
          active={sidebarOpen}
        />
      </div>

      {/* Row 2: Search + filters — visible only when context loaded */}
      <div
        className={`flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#141414]/90 p-2 backdrop-blur-sm transition-opacity duration-300 ${
          !hasContext ? "opacity-0 pointer-events-none h-0 overflow-hidden p-0 border-0" : "opacity-100"
        }`}
      >
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-72 rounded-lg border border-zinc-300 dark:border-white/[0.10] px-3 py-1.5 text-sm text-zinc-900 dark:text-slate-100 dark:bg-white/[0.05] placeholder:text-zinc-500 dark:placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
          placeholder={t("mapping.searchPlaceholder")}
        />
        <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-[#141414]/90 px-3 py-1.5 text-xs text-zinc-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={showUnmappedOnly}
            onChange={(e) => setShowUnmappedOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-white/[0.10] text-brand-500 focus:ring-brand-500/40"
          />
          Chưa mapping
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-white/[0.10] bg-white dark:bg-[#141414]/90 px-3 py-1.5 text-xs text-zinc-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={showTechnicalKeys}
            onChange={(e) => setShowTechnicalKeys(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-white/[0.10] text-brand-500 focus:ring-brand-500/40"
          />
          Technical keys
        </label>
      </div>
    </div>
  );
}
