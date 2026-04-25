# Code Reuse Audit — KHCN Customer Sections

**Phạm vi:** 10 file mới (3 frontend sections + 7 API routes)
**Ngày:** 2026-03-12

---

## 1. Duplication NGHIÊM TRỌNG — `inputCls` / `btnCls` (3x)

Cả 3 component đều khai báo 2 hằng CSS **giống hệt nhau**:

| File | Dòng |
|------|------|
| `customer-co-borrower-section.tsx` | 41–44 |
| `customer-related-person-section.tsx` | 25–28 |
| `customer-branch-staff-section.tsx` | 44–47 |

Ngoài ra, file `customer-collateral-section.tsx` và `[id]/page.tsx`, `loan-plans/new/page.tsx`, `loan-plans/[planId]/page.tsx`, `loan-plans/[planId]/cost-items-table.tsx`, `new/page.tsx` cũng dùng cùng `inputCls` pattern (xem grep kết quả: 9 file).

**Fix:** Tách ra `src/app/report/customers/[id]/components/form-styles.ts`:
```ts
export const inputCls = "w-full rounded-md border border-zinc-200 ...";
export const btnCls   = "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150";
```
Import trong tất cả các file đó.

---

## 2. Duplication CAO — Form + Row/Card pattern (3x copy-paste)

3 component có cùng cấu trúc **hoàn toàn giống nhau**:

```
[Form component]
  - useState(form), saving, error
  - handleSave: fetch POST/PATCH → onSaved()
  - JSX: grid FIELDS.map → input, error p, 2 buttons

[Row/Card component]
  - useState(editing, deleting)
  - handleDelete: fetch DELETE → onRefresh()
  - if editing → render Form; else render field display grid + Pencil/Trash2 buttons

[Section export]
  - useState(items, loading, showForm)
  - useCallback load() → fetch GET → setItems
  - useEffect → load()
  - loading spinner, header + Add button, empty state, items.map(Row)
```

**Cụ thể:**
- `CoBorrowerForm` (co-borrower L46–111) ≈ `RelatedPersonForm` (related-person L30–95) ≈ `BranchForm` (branch-staff L51–115): ~65 dòng mỗi loại, khác nhau chỉ FIELDS và API URL
- `CoBorrowerRow` (L113–173) ≈ `RelatedPersonRow` (L97–157): ~60 dòng, khác nhau chỉ confirm message và API URL
- `CustomerCoBorrowerSection` (L175–232) ≈ `CustomerRelatedPersonSection` (L159–216): ~55 dòng, khác nhau chỉ title và API endpoint

**Fix đề xuất:** Tạo generic component `customer-crud-section.tsx`:
```tsx
// Props:
// - title: string
// - fields: { key: string; label: string; required?: boolean }[]
// - apiBase: string           // e.g. `/api/customers/${id}/co-borrowers`
// - emptyText: string
// - renderExtra?: (item) => ReactNode   // cho BranchCard's isActive logic
```
3 section hiện tại chỉ cần ~10 dòng config mỗi cái.

---

## 3. Duplication TRUNG BÌNH — API error handling pattern (6 routes)

Tất cả 6–7 route đều có cùng try-catch boilerplate:
```ts
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : "Unknown error";
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}
```

Các route bị ảnh hưởng:
- `co-borrowers/route.ts` L15–18, L49–52
- `co-borrowers/[cobId]/route.ts` L27–30, L40–43
- `related-persons/route.ts` L15–18, L43–46
- `branches/route.ts` L10–13, L41–44

**Fix:** Kiểm tra xem đã có `src/lib/api-utils.ts` hoặc tương đương chưa. Nếu chưa, tạo helper:
```ts
export function apiError(e: unknown, status = 500) {
  const msg = e instanceof Error ? e.message : "Unknown error";
  return NextResponse.json({ ok: false, error: msg }, { status });
}
```

**Kiểm tra trước khi tạo mới:**
```
Grep pattern="apiError|api-error|handleApiError" path=src/lib
```

---

## 4. Không có shared CRUD helper trong codebase hiện tại

Grep `inputCls|btnCls` trong `.tsx` trả về 0 kết quả trong `src/components/` — xác nhận chưa có shared form utilities nào. Mọi duplication đều mới hoàn toàn.

---

## Tóm tắt ưu tiên

| # | Vấn đề | Mức độ | Action |
|---|--------|--------|--------|
| 1 | `inputCls`/`btnCls` trùng 9 file | High | Tạo `form-styles.ts`, import lại |
| 2 | Form+Row+Section pattern trùng 3x | High | Tạo `customer-crud-section.tsx` generic |
| 3 | API try-catch boilerplate trùng ~10 lần | Medium | Tạo `apiError()` helper trong `src/lib/` |

---

## Câu hỏi chưa giải quyết

- `BranchCard` có `isActive`/`onSelect` riêng → generic Section cần hỗ trợ "selection mode". Có thể giữ `BranchListSection` tách biệt và chỉ extract Form+Row generic?
- `customer-collateral-section.tsx` có FIELDS phức tạp hơn (per-type fields) → chưa rõ có thể đưa vào generic Section không, cần xem thêm file đó.
