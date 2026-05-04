# Phase 05 — Wire vào `/report/invoices` + verify build

## Context Links

- Scout: [`plans/reports/scout-260504-0752-thong-bao-no-chung-tu-export.md`](../reports/scout-260504-0752-thong-bao-no-chung-tu-export.md)
- Depends on: Phase 04 modal.

## Overview

- Priority: P2.
- Status: pending.
- Thêm nút "Tải danh sách nợ" vào page, mount modal, verify end-to-end manual.

## Requirements

- Nút mới cạnh "Thông báo đến hạn", cùng style.
- State `showExportModal` trong page.
- Truyền summary đã filter (customer có nợ) vào modal.
- Manual verify golden path.

## Related Code Files

- Modify: `src/app/report/invoices/page.tsx`
- Read-only: `src/components/invoice-tracking/overdue-export-modal.tsx` (Phase 04)

## Implementation Steps

1. Mở `src/app/report/invoices/page.tsx`. Tìm nơi render nút "Thông báo đến hạn".
2. Thêm state: `const [showExportModal, setShowExportModal] = useState(false);`
3. Thêm nút "Tải danh sách nợ" cùng style (button group, kế bên).
4. Filter summary: `const customersWithDebt = summary.filter(c => c.overdueCount + c.needsSupplementCount > 0);`
   - Tên field chính xác sẽ kiểm khi implement (có thể là `dueSoonCount` thêm vào điều kiện).
   - Logic include: `overdueCount > 0 || dueSoonCount > 0 || needsSupplementCount > 0`.
5. Mount modal:
   ```tsx
   {showExportModal && (
     <OverdueExportModal
       customers={customersWithDebt}
       onClose={() => setShowExportModal(false)}
     />
   )}
   ```
6. `npm run build` — fix any TS error.
7. Manual test golden path:
   - Login dev, vào `/report/invoices`.
   - Click "Tải danh sách nợ" → modal mở.
   - Tick 1 customer + cả 3 type → click "Tải XLSX".
   - Open file → verify 3 sheet đúng tên + data match notification panel.
   - Repeat: tick chỉ "Cần bổ sung" → 2 sheet kia rỗng.
8. Edge case test:
   - 0 customer có nợ → modal hiện empty state (acceptable cho v1, không cần special handling).
   - Lỗi 401 (clear cookie) → error hiển thị.

## Todo List

- [ ] Add `showExportModal` state
- [ ] Add nút "Tải danh sách nợ"
- [ ] Filter `customersWithDebt`
- [ ] Mount `<OverdueExportModal>`
- [ ] `npm run build` pass
- [ ] Manual golden path test
- [ ] Manual edge case (no customer / 401)

## Success Criteria

- Build pass.
- File XLSX download được, mở Excel ok, data chính xác match notification panel.
- Không regression: nút "Thông báo đến hạn" cũ vẫn hoạt động.

## Risk Assessment

- **Risk:** Field name summary không khớp (`dueSoonCount` vs `nearDueCount`). **Mitigation:** Đọc type từ `getCustomerSummary` trước khi filter.
- **Risk:** Layout button bị bể trên mobile. **Mitigation:** dùng flex-wrap.

## Security Considerations

- Nút chỉ render khi đã login (page đã behind session — không cần check thêm).

## Next Steps

- Done. Nếu user muốn email digest on-demand → mở plan mới (out of scope).
