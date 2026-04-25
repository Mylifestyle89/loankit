# Code Review: KHCN Customer Fields & Related Sections

**Date:** 2026-03-12
**Branch:** KHCN-implement
**Files reviewed:** customer.service.ts, api/customers/route.ts, [id]/page.tsx, customer-co-borrower-section.tsx, customer-related-person-section.tsx, customer-branch-staff-section.tsx, api/customers/[id]/co-borrowers/route.ts, api/customers/[id]/related-persons/route.ts

---

## Critical Issues

Không có lỗi bảo mật nghiêm trọng.

---

## High Priority

### 1. Copy-paste section — CoBorrower vs RelatedPerson components [HIGH]

`customer-co-borrower-section.tsx` và `customer-related-person-section.tsx` là **clone gần như y hệt nhau**:
- Pattern `FIELDS[]` → render form → render row → load/refresh → empty state: giống 100% logic
- Khác nhau: type name, API path, required field key (`full_name` vs `name`), FIELDS content

**Hậu quả:** Bug fix hoặc UI change phải áp dụng 2 lần (và sẽ bị quên).

**Fix đề xuất:** Tách một generic hook `useCrudSection(apiBase, requiredField)` + generic `CrudSection` component nhận `fields`, `apiBase`, `emptyText`, `title` làm props. Cả hai section chỉ còn là config wrapper.

---

### 2. `toUpdateDbData` dùng `Record<string, unknown>` thay vì typed [HIGH]

```ts
function toUpdateDbData(input: UpdateCustomerInput) {
  const data: Record<string, unknown> = {};
  ...
  return data;
}
```

Prisma sẽ không báo lỗi compile nếu key sai hoặc value type không match schema. Mất toàn bộ type safety khi truyền vào `prisma.customer.update({ data })`.

**Fix:** Dùng `Prisma.CustomerUpdateInput` trực tiếp:
```ts
import type { Prisma } from "@prisma/client";
function toUpdateDbData(input: UpdateCustomerInput): Prisma.CustomerUpdateInput {
  const data: Prisma.CustomerUpdateInput = {};
  ...
  return data;
}
```

---

### 3. Delete không có error handling trong UI [HIGH]

Cả `CoBorrowerRow.handleDelete` và `RelatedPersonRow.handleDelete` và `BranchCard.handleDelete`:
```ts
await fetch(..., { method: "DELETE" }); // không check res.ok, không catch lỗi API
onRefresh(); // gọi dù delete có thể fail
```

Nếu delete fail (403, 500), UI vẫn refresh và không báo lỗi gì cho user.

**Fix:** Check `res.ok` và set error state trước khi gọi `onRefresh()`.

---

## Medium Priority

### 4. `customer_type` là stringly-typed, thiếu enum [MEDIUM]

Trong `customer.service.ts` và nhiều nơi:
```ts
customer_type?: string; // "corporate" | "individual"
```

Nhưng dùng string literal rải rác: `"individual"`, `"corporate"` ở `page.tsx`, `service.ts`, `route.ts`. Nếu thêm type mới sẽ miss cases.

**Fix:** Tạo constant hoặc enum:
```ts
export const CUSTOMER_TYPE = { CORPORATE: "corporate", INDIVIDUAL: "individual" } as const;
export type CustomerType = typeof CUSTOMER_TYPE[keyof typeof CUSTOMER_TYPE];
```

---

### 5. `selectBranch` trong `BranchListSection` không handle error [MEDIUM]

```ts
async function selectBranch(branchId: string) {
  onActiveBranchChange(newId); // UI update trước
  await fetch("/api/config/branch-staff", ...); // nếu fail → UI lệch với server
}
```

Optimistic update nhưng không rollback khi fail.

---

### 6. `page.tsx` dùng `setTimeout(0)` để load dữ liệu [MEDIUM]

```ts
useEffect(() => {
  const timer = window.setTimeout(() => { void loadCustomer(); }, 0);
  return () => window.clearTimeout(timer);
}, [loadCustomer]);
```

Pattern `setTimeout(0)` không cần thiết — `useEffect` đã chạy sau render. Đây là dấu hiệu hack để tránh một vấn đề nào đó không được document rõ.

---

### 7. `BranchStaffSection` — `StaffSection` nhận `initial` prop nhưng không sync khi parent re-render [MEDIUM]

```ts
function StaffSection({ initial }: { initial: StaffData }) {
  const [form, setForm] = useState<StaffData>(initial); // initial chỉ dùng 1 lần
```

Nếu parent load lại config (ví dụ tab switch), `StaffSection` sẽ vẫn giữ state cũ.

---

## Low Priority

### 8. `BranchStaffSection` — "branch" tab trong main nav và "branch" subtab trong section dùng cùng key `"branch"` [LOW]

`allTabs` có `key: "branch"` cho tab chính, và `BranchStaffSection` cũng có internal subtab `"branch"`. Không gây bug hiện tại nhưng dễ gây nhầm khi đọc code.

### 9. Hai `FIELD_TO_COLUMN` và `COLUMN_TO_FIELD` là manual inverse của nhau [LOW]

Dễ lệch nếu thêm field mới vào một map mà quên map kia. Nên generate tự động:
```ts
const COLUMN_TO_FIELD = Object.fromEntries(
  Object.entries(FIELD_TO_COLUMN).map(([k, v]) => [v, k])
);
```

### 10. API routes mới thiếu auth guard [LOW]

`/api/customers/[id]/co-borrowers`, `/related-persons`, `/api/branches`, `/api/config/branch-staff` — không có `requireAdmin()` như main customers route. Ai cũng có thể POST/DELETE.

---

## Tóm tắt ưu tiên

| # | Mức | Vấn đề |
|---|-----|--------|
| 2 | HIGH | `toUpdateDbData` mất type safety Prisma |
| 3 | HIGH | Delete không handle error → silent fail |
| 1 | HIGH | 2 section copy-paste — DRY violation |
| 4 | MEDIUM | `customer_type` stringly-typed |
| 5 | MEDIUM | `selectBranch` optimistic update không rollback |
| 6 | MEDIUM | `setTimeout(0)` hack pattern |
| 7 | MEDIUM | `StaffSection` state không sync khi re-render |
| 10 | LOW | API sub-routes thiếu auth |
| 9 | LOW | Dual maps có thể lệch |
| 8 | LOW | Key naming ambiguity |

---

## Điểm tốt

- `FIELDS[]` array-driven form pattern trong co-borrower/related-person — DRY tốt trong nội bộ mỗi file
- `BranchForm`/`CoBorrowerForm` đều có try/catch đúng chỗ
- `toCreateDbData` typed rõ, ko dùng `Record<string,unknown>`
- `saveFromDraft` dùng transaction Prisma — đúng
- Tự động pull global branch/staff config khi tạo customer mới — UX tốt

---

## Câu hỏi chưa giải quyết

1. Tại sao `setTimeout(0)` được dùng ở `page.tsx`? Có vấn đề gì với `useEffect` trực tiếp không?
2. Các API sub-routes có intentionally public (no auth) hay bị bỏ sót?
3. `customer_type` có kế hoạch thêm type thứ 3 không? Nếu không, nên lock với union type.
