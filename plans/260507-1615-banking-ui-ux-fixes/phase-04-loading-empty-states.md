---
phase: 4
title: "Loading + empty states"
status: pending
priority: P2
effort: 6-8h
blocks_on: phase-02 (uses brand color tokens)
---

# Phase 4 — Loading + empty states

Banking tool data load chậm (Prisma joins, encrypted PII, master template fetch) → thiếu skeleton/spinner = UX bad.

## Skeleton states

### 4a — Identify candidates

Audit pages có async data load > 200ms:
- Customer list table (`/khdn/customers`)
- Customer detail tabs (relations heavy)
- Mapping page (master + values)
- Build/export tab (runs)
- Dashboard stats

### 4b — Skeleton component

Use Tailwind native (no library — YAGNI):
```tsx
<div className="animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 h-4 w-3/4" />
```

Wrap mẫu cho từng pattern:
- `<TableRowSkeleton columns={5} />`
- `<CardSkeleton />`
- `<StatCardSkeleton />`
- `<DetailFieldSkeleton />`

Place: `src/components/skeleton/` (new dir).

### 4c — Wire vào loading states

Replace existing spinner-only loading UI với skeleton. Pattern:
```tsx
{loading ? <TableRowSkeleton /> : <DataTable rows={rows} />}
```

Verify mỗi page có loading branch render skeleton, không leave empty <div /> gây content-jumping (per UX rule `content-jumping`).

## Empty states

### 4d — Catalog scenarios

Audit "what if data is 0" cho mỗi list/table:
- Customer list: "Chưa có khách hàng nào — Thêm khách hàng đầu tiên" + button
- Loan list per customer: "KH chưa có khoản vay" + button "Tạo khoản vay"
- Collateral: "Chưa có TSBĐ"
- Disbursement: "Chưa giải ngân"
- Mapping: "Chưa chọn template" (đã làm trong phase 1 bug 2)
- Search results: "Không tìm thấy KH với từ khóa..."

### 4e — Empty state component

Reusable:
```tsx
<EmptyState
  icon={<UsersIcon />}
  title="Chưa có khách hàng nào"
  description="Bắt đầu bằng cách thêm KH đầu tiên hoặc import từ file Excel"
  action={<Button>Thêm khách hàng</Button>}
/>
```

Place: `src/components/empty-state.tsx`.

Icons từ `lucide-react` (đã dùng trong project) — KHÔNG emoji per UX rule `no-emoji-icons`.

### 4f — Wire vào pages

Replace mọi `if (rows.length === 0) return null` → render `<EmptyState />`.

## Acceptance

- 5 hot paths có skeleton (customer list/detail/mapping/dashboard/build)
- 6+ empty state scenarios có guide message + primary action
- No empty `<div />` gaps khi loading
- Content-jumping rule: skeleton placeholder match content height

## Risks

- Skeleton over-engineering — YAGNI, không cần shimmer effect cao cấp
- Empty state messages tone — Banking professional, không quá casual ("Bạn chưa có gì cả!")
