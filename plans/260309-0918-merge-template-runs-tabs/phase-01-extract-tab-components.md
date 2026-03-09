# Phase 1: Extract Tab Components

## Overview
- **Priority:** High
- **Status:** Pending
- **Description:** Tách configured templates section → component riêng, tạo BuildExportTab từ runs page

## Key Insights
- Template page hiện tại đã có 2 sub-tabs ("configured" / "folder") → tách "configured" ra component
- Runs page logic (build, export, freshness, run logs) → extract thành BuildExportTab
- Cả 2 tab mới đều nhận shared props từ page parent

## Related Code Files

### Modify
- `src/app/report/template/page.tsx` — extract configured section ra component

### Create
- `src/app/report/template/_components/configured-templates-tab.tsx` — từ configured section
- `src/app/report/template/_components/build-export-tab.tsx` — từ runs/page.tsx

### Read Only
- `src/app/report/runs/page.tsx` — source cho BuildExportTab
- `src/app/report/template/_components/field-injection-toolbar.tsx` — used by configured tab
- `src/app/report/template/_components/use-field-injection.ts` — hook sẽ gọi ở page level

## Implementation Steps

### Step 1: Define SharedTabProps
Tạo type dùng chung cho tất cả tab components:
```ts
// Có thể đặt inline hoặc trong file riêng nếu cần
type SharedTabProps = {
  templates: TemplateProfile[];
  activeTemplateId: string;
  profileDocxPath: string;
  onMessage: (msg: string) => void;
  onError: (err: string) => void;
  onReloadTemplates: () => Promise<void>;
};
```

### Step 2: Create configured-templates-tab.tsx (~100 LOC)
Extract từ `page.tsx` lines 237-265 (activeTab === "configured" block):
- Props: SharedTabProps + editor functions + field injection props + remove handler
- Chứa: template actions (open docx, open editor, local file, remove), FieldInjectionToolbar
- KHÔNG chứa: template selector (di chuyển lên header chung)

### Step 3: Create build-export-tab.tsx (~120 LOC)
Extract từ `runs/page.tsx`:
- Props: SharedTabProps (template info từ parent, không fetch lại)
- State riêng: `runs`, `loading`, `runningBuild`, `runningExport`, `buildResult`, `freshness`, `onlyOfficePreviewPath`, `previewClosed`
- Functions: `loadRuns`, `loadFreshness`, `runBuildValidate`, `runExportPreview`, `handleDownloadDocx`, `flushZustandDraft`
- Render: freshness status, action buttons (build, export, download, re-open), build result, run logs with per-path download
- KHÔNG chứa: template selector, OnlyOffice modal (dùng callback lên parent)

Key change in BuildExportTab:
- Nhận `templates` + `activeTemplateId` từ props thay vì tự fetch
- Export gọi `onOpenPreview(filePath)` callback → parent mở OnlyOffice modal
- Hoặc tự quản lý OnlyOffice modal (simpler, giữ self-contained)

**Decision:** BuildExportTab tự quản lý OnlyOffice modal riêng — vì modal này preview output (khác với editor modal của configured tab). Giữ tách biệt, tránh coupling.

### Step 4: Verify individual components compile
```bash
npx tsc --noEmit
```

## Todo List
- [ ] Define SharedTabProps type
- [ ] Create configured-templates-tab.tsx
- [ ] Create build-export-tab.tsx
- [ ] Verify TypeScript compile

## Success Criteria
- 2 component mới tạo, mỗi file ≤ 150 LOC
- Props interface rõ ràng
- TypeScript compile pass
- Chưa thay đổi page.tsx rendering (phase 2)

## Risk Assessment
- **Medium:** Props drilling nhiều → giữ interface gọn, chỉ pass cần thiết
- **Low:** Logic copy từ existing code, ít risk regression
