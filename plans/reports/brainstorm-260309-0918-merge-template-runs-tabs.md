# Brainstorm: Gộp tab "Quản lý Mẫu" và "Run & Preview"

## Problem Statement
2 tab riêng biệt `/report/template` và `/report/runs` có chức năng liên quan chặt chẽ. User phải chuyển qua lại giữa 2 tab để hoàn thành flow: chọn template → chỉnh sửa → export → xem kết quả. Template selector bị duplicate ở cả 2 page.

## Decisions Made

### Layout: Gộp thành 1 page, 3 sub-tabs
- 1 page duy nhất tại `/report/template`
- 3 sub-tab: **[Chỉnh sửa mẫu]** | **[Duyệt folder]** | **[Build & Export]**
- Template selector đặt ở **header chung**, dùng chung cho cả 3 tab
- Editor type toggle (OnlyOffice/Eigenpal) cũng ở header chung

### Code Structure: Tab-based components
```
src/app/report/template/
  page.tsx                         (~100-120 LOC)
    └─ shared state, header, template selector,
       tab router, shared modals (OnlyOffice, Eigenpal)
  _components/
    configured-templates-tab.tsx    (~100 LOC) ← from current "configured" tab
    folder-browser-tab.tsx          (existing, minor updates)
    build-export-tab.tsx            (~120 LOC) ← from runs/page.tsx
    field-injection-toolbar.tsx     (existing, no change)
    field-reference-panel.tsx       (existing, no change)
    template-validation-report-modal.tsx (existing, no change)
    use-field-injection.ts          (existing, no change)
    use-template-upload-validation.ts (existing, no change)
```

### Migration: Xóa runs/page.tsx, redirect
```tsx
// src/app/report/runs/page.tsx → simple redirect
import { redirect } from 'next/navigation';
export default function RunsPage() {
  redirect('/report/template?tab=export');
}
```
- Sidebar: bỏ entry "Runs" hoặc giữ nhưng navigate tới `/report/template?tab=export`

## Architecture

### Shared State (page.tsx quản lý)
- `templates[]`, `activeTemplateId` → truyền xuống tất cả tab
- `editorType` (onlyoffice/eigenpal), `onlyofficeAvailable`
- `showEditor`, `editorBuffer`, `showOnlyofficeEditor` → shared modals
- `message`, `error` → shared notification

### Tab Props Interface
```ts
type SharedTabProps = {
  templates: TemplateProfile[];
  activeTemplateId: string;
  onTemplateChange: (id: string) => void;
  onMessage: (msg: string) => void;
  onError: (err: string) => void;
  onReloadTemplates: () => Promise<void>;
};
```

### Tab-specific Props
- `ConfiguredTemplatesTab`: + editor open functions, field injection, remove template
- `FolderBrowserTab`: + onOpenEditor, onRegisterTemplate, onUploadValidate
- `BuildExportTab`: + freshness, runs, build/export functions

### URL Tab Sync
- Read tab from `?tab=configured|folder|export` (default: `configured`)
- Update URL on tab change via `router.replace` (no page reload)

## ASCII Layout
```
┌─────────────────────────────────────────────────────┐
│  Quản lý Mẫu & Xuất Báo Cáo                       │
│  Template: [▾ Mẫu 2268 (active)]                   │
│  [OnlyOffice ◀▶ Eigenpal]                           │
│  ✓ message  |  ✗ error                              │
├─────────────────────────────────────────────────────┤
│  [Chỉnh sửa mẫu]  [Duyệt folder]  [Build & Export]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  (Tab content renders here)                         │
│                                                     │
│  Tab 1: Edit buttons, field injection toolbar       │
│  Tab 2: Folder browser, field reference panel       │
│  Tab 3: Freshness, build/export, run logs           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Risks & Mitigations
| Risk | Severity | Mitigation |
|------|----------|------------|
| Page.tsx vượt 200 LOC | Medium | Tab-based split giữ mỗi file ~100-120 LOC |
| Props drilling nhiều | Low | SharedTabProps interface rõ ràng |
| Bookmark cũ /report/runs | Low | Redirect tự động |
| State phức tạp hơn | Medium | Chỉ page.tsx quản lý shared state, tab components stateless hơn |

## Success Metrics
- Sidebar giảm 1 tab
- User flow chọn template → chỉnh sửa → export không cần chuyển page
- Mỗi file code ≤ 150 LOC
- TypeScript compile pass, 0 regression

## Implementation Considerations
- Cần update sidebar nav trong `layout.tsx` (bỏ/redirect entry "Runs")
- Cần update i18n keys nếu đổi tên tab
- Field injection hook (`useFieldInjection`) gọi 1 lần ở page, truyền xuống tabs
- OnlyOffice/Eigenpal modals render ở page level (shared), không duplicate trong tabs
