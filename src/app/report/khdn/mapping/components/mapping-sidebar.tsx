import { Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "../stores/use-ui-store";
import { SidebarToolsSection } from "./sidebar/sidebar-tools-section";
import { SidebarDataIoSection } from "./sidebar/sidebar-data-io-section";
import { DocxMergeModal } from "./modals/docx-merge-modal";

export type MappingSidebarProps = {
  openMergeGroupsModal: () => void;
  handleImportFieldFile: (
    e: React.ChangeEvent<HTMLInputElement>,
    options?: { mode?: "append" | "overwrite"; templateName?: string | null },
  ) => void;
  onOpenSnapshotRestore: () => void;
};

export function MappingSidebar({
  openMergeGroupsModal,
  handleImportFieldFile,
  onOpenSnapshotRestore,
}: MappingSidebarProps) {
  const isOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const [docxMergeOpen, setDocxMergeOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const closeSidebar = () => setSidebarOpen(false);

  // Close sidebar on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  if (!portalTarget) return null;

  return (
    <>
      {createPortal(
        <>
          <AnimatePresence>
            {isOpen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
                onClick={closeSidebar}
                aria-hidden="true"
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {isOpen ? (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                role="dialog"
                aria-modal="true"
                aria-label="Tùy chọn khác"
                className="fixed inset-y-0 right-0 z-[101] flex h-screen w-full max-w-[380px] flex-col border-l border-slate-200/60 dark:border-white/[0.07] bg-slate-50/80 dark:bg-[#141414]/90 shadow-2xl backdrop-blur-xl"
              >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 dark:border-white/[0.07] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300/50 bg-gradient-to-br from-amber-600 to-orange-500 text-white shadow-sm shadow-amber-500/25">
                      <Settings className="h-4 w-4" />
                    </span>
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Tùy chọn khác</h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeSidebar}
                    aria-label="Đóng sidebar"
                    title="Đóng"
                    className="rounded-lg p-2 text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.07] hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                  <div className="flex-1 space-y-6 px-4 py-5">
                    <SidebarToolsSection
                      openMergeGroupsModal={openMergeGroupsModal}
                      onOpenDocxMerge={() => setDocxMergeOpen(true)}
                      onOpenSnapshotRestore={onOpenSnapshotRestore}
                      onCloseSidebar={closeSidebar}
                    />

                    <hr className="border-slate-200/60 dark:border-white/[0.07]" />

                    <SidebarDataIoSection
                      handleImportFieldFile={handleImportFieldFile}
                      onCloseSidebar={closeSidebar}
                    />
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>,
        portalTarget,
      )}

      <DocxMergeModal isOpen={docxMergeOpen} onClose={() => setDocxMergeOpen(false)} />
    </>
  );
}
