# Code Review – Phase 9 Code Reuse (New Files)

Date: 2026-03-11
Files: khcn-template-registry.ts, route.ts (khcn), khcn-doc-checklist.tsx, [id]/page.tsx (tab edit)

---

## Tổng quan

3 file mới đều nhỏ gọn, đúng SRP. Registry tách sạch khỏi UI. Không có vấn đề nghiêm trọng.

---

## Phát hiện trùng lặp / cơ hội tái sử dụng

### 1. Segment-button (pill tab) — TRÙNG LẶP CẦN QUAN TÂM

`khcn-doc-checklist.tsx:59-73` và `customer-export-modal.tsx:87-102` dùng cùng một pattern segment button:
```
div.flex.rounded-lg.border.border-zinc-200.dark:border-white/[0.09].overflow-hidden
  button.px-3.py-1.5.text-xs/sm.font-medium.transition-colors
    active: bg-violet-600 text-white
    inactive: bg-white dark:bg-[#1a1a1a] ...
```
Hai nơi chỉ khác nhau `text-xs` vs `text-sm`. Đây là UI pattern xuất hiện ít nhất 2 lần, nên extract thành component `SegmentButtons` nhỏ (props: `options`, `value`, `onChange`, `size?`).

### 2. Spinner loading — ĐÃ NHIỀU NƠI

`khcn-doc-checklist.tsx:90-92` dùng:
```
h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600
```
Pattern này xuất hiện ở 14 file (xác nhận qua grep). Nếu chưa có component `<Spinner />` dùng chung, đây là nơi phù hợp nhất để tạo (size prop: 4/5/6).

### 3. KhcnDocChecklist — fetch không có try/catch

`khcn-doc-checklist.tsx:28-35`: `fetch().then().then()` không wrap try/catch. Nếu network lỗi, `setLoading(false)` không được gọi → spinner treo mãi. Đây là lỗi logic, không phải style.

```ts
// Hiện tại
fetch(`/api/report/templates/khcn?loan_method=${method}`)
  .then((r) => r.json())
  .then((d) => {
    if (d.ok) setCategories(d.categories ?? []);
    setLoading(false);
  });

// Nên thêm .catch
  .catch(() => setLoading(false));
```

### 4. API route — trực tiếp dùng logic thay vì round-trip HTTP

`khcn-doc-checklist.tsx:29` gọi `/api/report/templates/khcn` — đây là client component gọi API để lấy data từ `khcn-template-registry.ts` (pure lib, không DB). Có thể import trực tiếp registry vào component, loại bỏ HTTP round-trip và API route không cần thiết.

Nếu API route này chỉ phục vụ component này, đây là over-engineering. Nếu cần exposed cho external/mobile, giữ nguyên.

### 5. groupByCategory — có thể dùng trực tiếp ở client

Hệ quả của #4: `groupByCategory` và `DOC_CATEGORY_LABELS` đã export từ registry. Component có thể `useMemo(() => groupByCategory(getTemplatesForMethod(method)), [method])` không cần fetch.

### 6. page.tsx — loanMethod fallback chưa type-safe

`page.tsx:314`:
```ts
loanMethod={customer.loans?.[0]?.loan_method}
```
`loan_method` là `any` (loans typed as `any[]`). Nếu giá trị không match `METHOD_OPTIONS`, component sẽ fallback về `"tung_lan"` (default state) — chấp nhận được nhưng nên note khi loans có type proper.

---

## Không phải vấn đề

- `khcn-template-registry.ts`: clean, đúng pattern, không có gì trùng lặp
- API route `/api/report/templates/khcn/route.ts`: 24 dòng, minimal, đúng convention
- `DOC_CATEGORY_LABELS` và `METHOD_OPTIONS` đều tái dụng đúng từ lib

---

## Ưu tiên xử lý

| Mức | Item |
|-----|------|
| High | #3 — fetch thiếu `.catch()` → spinner treo khi lỗi mạng |
| Medium | #4/#5 — xem xét bỏ HTTP round-trip, dùng import trực tiếp (nếu không cần public API) |
| Medium | #1/#2 — SegmentButtons + Spinner component (accumulate trước khi extract) |
| Low | #6 — type-safety cho loans |

---

## Câu hỏi chưa giải quyết

- API `/api/report/templates/khcn` có được dùng ngoài `KhcnDocChecklist` không (external client, mobile)? Nếu không, nên xóa và dùng import trực tiếp.
- `checked` state trong `KhcnDocChecklist` hiện chỉ lưu in-memory. Có yêu cầu persist (localStorage / DB) không?
