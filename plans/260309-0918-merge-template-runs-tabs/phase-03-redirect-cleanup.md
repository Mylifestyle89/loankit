# Phase 3: Redirect Runs + Update Sidebar + Cleanup

## Overview
- **Priority:** Medium
- **Status:** Pending
- **Description:** Replace runs/page.tsx with redirect, remove "Runs" from sidebar, cleanup unused code

## Related Code Files

### Modify
- `src/app/report/runs/page.tsx` — replace with redirect
- `src/app/report/layout.tsx` — remove "Runs" nav entry

### Delete (after redirect confirmed working)
- Không xóa file nào — runs/page.tsx giữ lại làm redirect

## Implementation Steps

### Step 1: Replace runs/page.tsx with redirect
```tsx
import { redirect } from "next/navigation";
export default function RunsPage() {
  redirect("/report/template?tab=export");
}
```
- Xóa toàn bộ code cũ, chỉ giữ redirect
- File "use client" → bỏ (redirect là server-side)

### Step 2: Remove "Runs" from sidebar
Trong `layout.tsx` line 41, xóa:
```ts
{ href: "/report/runs", label: t("nav.runs"), icon: Play },
```
Cũng bỏ `Play` import nếu không dùng elsewhere.

### Step 3: Cleanup unused imports
- Kiểm tra `Play` icon có dùng ở đâu khác không
- Xóa các import không dùng trong layout.tsx

### Step 4: Final compile + verify
```bash
npx tsc --noEmit
```

### Step 5: Manual test checklist
- [ ] Navigate `/report/template` → thấy 3 tabs
- [ ] Click qua từng tab → content đúng
- [ ] Template selector ở header → thay đổi ảnh hưởng tất cả tabs
- [ ] Tab "Build & Export" → build + export hoạt động
- [ ] Navigate `/report/runs` → redirect tự động về `?tab=export`
- [ ] Sidebar không còn "Runs" entry

## Todo List
- [ ] Replace runs/page.tsx with redirect
- [ ] Remove "Runs" from sidebar nav
- [ ] Cleanup unused imports
- [ ] Final compile check
- [ ] Verify redirect works

## Success Criteria
- `/report/runs` redirect → `/report/template?tab=export`
- Sidebar chỉ còn 6 entries (bỏ Runs)
- TypeScript compile pass
- No dead code remaining

## Risk Assessment
- **Low:** Simple redirect, straightforward cleanup
- **Low:** Bookmarks/links cũ vẫn hoạt động qua redirect
