# Phase 04 — Export modal UI

## Context Links

- Scout: [`plans/reports/scout-260504-0752-thong-bao-no-chung-tu-export.md`](../reports/scout-260504-0752-thong-bao-no-chung-tu-export.md)
- Pattern: `src/components/invoice-tracking/notification-history-modal.tsx`, `src/components/ui/base-modal.tsx`.
- Memory: Turbopack dev drop binary qua `showSaveFilePicker` → `save-file-with-picker.ts` đã gate dev/prod.
- Depends on: Phase 03 endpoint.

## Overview

- Priority: P2.
- Status: pending.
- Modal chọn customer (multi-checkbox) + filter type, nút "Tải XLSX" → fetch endpoint → `saveFileWithPicker`.

## Requirements

- Functional:
  - Hiển thị list customer có nợ (`overdueCount + needsSupplementCount > 0`) — input từ parent (summary đã fetch).
  - Mỗi customer: checkbox + tên + count (quá hạn / sắp đến hạn / cần bổ sung).
  - Shortcut "Chọn tất cả" / "Bỏ chọn".
  - 3 checkbox type filter: "Quá hạn" / "Sắp đến hạn" / "Cần bổ sung". Default: tất cả tick.
  - Nút "Tải XLSX": disable nếu chưa chọn customer hoặc chưa chọn type. Khi click → fetch + save.
  - Loading state khi đang download.
  - Error toast (dùng `useDownloadToastStore` hoặc plain alert) nếu fetch fail.
- Non-functional: file ≤ 200 lines.

## Architecture

```
<OverdueExportModal
  open
  onClose
  customers={summary.filter(c => c.overdueCount + c.needsSupplementCount > 0)}
/>
  state: selectedIds: Set<string>, selectedTypes: Set<"overdue"|"dueSoon"|"supplement">, downloading
  on submit:
    GET /api/invoices/overdue-export?customerIds=...&types=...
    blob = res.blob()
    saveFileWithPicker(blob, `no-chung-tu-${YYYYMMDD}.xlsx`)
    onClose()
```

## Related Code Files

- Create: `src/components/invoice-tracking/overdue-export-modal.tsx`
- Read-only: `src/components/ui/base-modal.tsx`, `src/lib/save-file-with-picker.ts`

## Implementation Steps

1. Create file. `"use client";`.
2. Props type:
   ```ts
   type CustomerSummary = {
     customerId: string;
     customerName: string;
     overdueCount: number;
     dueSoonCount: number;
     needsSupplementCount: number;
   };
   type Props = { customers: CustomerSummary[]; onClose: () => void };
   ```
3. State:
   - `selectedIds: Set<string>` (default empty).
   - `selectedTypes: Set<"overdue"|"dueSoon"|"supplement">` (default all 3).
   - `downloading: boolean`.
   - `error: string | null`.
4. UI layout (BaseModal):
   - Header: "Tải danh sách nợ chứng từ".
   - Section 1: 3 checkbox type filter (horizontal).
   - Section 2: Action bar "Chọn tất cả" / "Bỏ chọn" + counter `{selected}/{total}`.
   - Section 3: scrollable list customer (max height ~400px). Mỗi row: checkbox, name, badges count (chỉ hiện count cho type đang tick).
   - Footer: Cancel + "Tải XLSX" (disabled khi `selectedIds.size === 0 || selectedTypes.size === 0 || downloading`).
5. Submit handler:
   - Build URL `?customerIds=${[...].join(",")}&types=${[...].join(",")}`.
   - `fetch(url)`. Nếu `!res.ok` → setError với JSON message.
   - `const blob = await res.blob();`
   - `const yyyymmdd = ...;`
   - `await saveFileWithPicker(blob, \`no-chung-tu-${yyyymmdd}.xlsx\`);`
   - `onClose()`.
6. Tách helper count display nếu cần để giữ < 200 lines.
7. `npm run build`.

## Todo List

- [ ] Create modal file with `"use client"`
- [ ] Define Props + state
- [ ] Type filter checkboxes
- [ ] Customer list with checkboxes + select all / clear
- [ ] Submit handler: fetch + saveFileWithPicker
- [ ] Disabled logic + loading spinner
- [ ] Error display
- [ ] File ≤ 200 lines
- [ ] `npm run build` pass

## Success Criteria

- Mở modal → thấy list customer có nợ.
- Tick 1 customer + 1 type → click "Tải XLSX" → file download có sheet đúng chứa data customer đó.
- Bỏ tick hết customer → button disabled.

## Risk Assessment

- **Risk:** `saveFileWithPicker` dev mode dùng anchor download. **Mitigation:** đã có gate sẵn — không cần gì.
- **Risk:** URL quá dài khi nhiều customerId. **Mitigation:** acceptable cho v1; nếu thực tế > 50 customer chuyển sang POST sau (defer YAGNI).
- **Risk:** User chọn 0 type → button disabled — guard rõ ràng UX.

## Security Considerations

- Không log customerIds vào console.
- Fetch dùng cookie session (same-origin) — không cần token.

## Next Steps

- Phase 05 wire vào page + verify build/E2E manual.
