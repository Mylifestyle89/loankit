# Phase 2: Refactor page.tsx → Unified Page with 3 Tabs

## Overview
- **Priority:** High
- **Status:** Pending
- **Description:** Refactor template/page.tsx thành unified page: shared header + template selector + 3 sub-tabs with URL sync

## Related Code Files

### Modify
- `src/app/report/template/page.tsx` — major refactor

### Read Only
- `src/app/report/template/_components/configured-templates-tab.tsx` — from phase 1
- `src/app/report/template/_components/build-export-tab.tsx` — from phase 1
- `src/app/report/template/_components/template-folder-browser.tsx` — existing folder tab

## Implementation Steps

### Step 1: Add URL tab sync
```ts
import { useSearchParams, useRouter } from "next/navigation";

const searchParams = useSearchParams();
const router = useRouter();
const tabParam = searchParams.get("tab");
// Map URL param → internal tab state
const validTabs = ["configured", "folder", "export"] as const;
type TabKey = (typeof validTabs)[number];
const activeTab = validTabs.includes(tabParam as TabKey)
  ? (tabParam as TabKey)
  : "configured";

function setActiveTab(tab: TabKey) {
  router.replace(`?tab=${tab}`, { scroll: false });
}
```

### Step 2: Refactor header
Move template selector OUT of configured tab → into shared header:
- Template `<select>` dropdown
- Editor type toggle (OnlyOffice/Eigenpal)
- Message/error display
- All trong header card hiện tại

### Step 3: Update tab switch UI
Thay 2 tabs hiện tại bằng 3 tabs:
```tsx
const tabs: { key: TabKey; label: string }[] = [
  { key: "configured", label: "Chỉnh sửa mẫu" },
  { key: "folder", label: "Duyệt folder mẫu" },
  { key: "export", label: "Build & Export" },
];
```

### Step 4: Render tab content
```tsx
{activeTab === "configured" && (
  <ConfiguredTemplatesTab ... />
)}
{activeTab === "folder" && (
  <>
    <TemplateFolderBrowser ... />
    <FieldReferencePanel ... />
    {/* validation UI */}
  </>
)}
{activeTab === "export" && (
  <BuildExportTab templates={templates} activeTemplateId={activeTemplateId} ... />
)}
```

### Step 5: Shared modals stay at page level
- Eigenpal DocxTemplateEditorModal — shared between configured + folder tabs
- OnlyOffice modal cho editing — shared between configured + folder tabs
- BuildExportTab có OnlyOffice modal riêng cho preview (tách biệt)

### Step 6: Verify page.tsx ≤ 150 LOC
Nếu vượt, extract thêm shared header thành component.

### Step 7: Compile check
```bash
npx tsc --noEmit
```

## Todo List
- [ ] Add URL tab sync via useSearchParams
- [ ] Move template selector to shared header
- [ ] Update tab switch UI (2 → 3 tabs)
- [ ] Wire ConfiguredTemplatesTab
- [ ] Wire BuildExportTab
- [ ] Keep folder tab + modals working
- [ ] Verify ≤ 150 LOC
- [ ] TypeScript compile pass

## Success Criteria
- page.tsx ≤ 150 LOC
- 3 tabs render correctly
- URL `?tab=` syncs with active tab
- Template selector in header affects all tabs
- All modals (editor, preview) work correctly

## Risk Assessment
- **Medium:** State wiring phức tạp — nhiều callbacks truyền xuống
- **Medium:** useSearchParams cần Suspense boundary trong Next.js App Router → wrap component
- **Low:** Regression trên folder tab — chỉ thay đổi cách nhận props
