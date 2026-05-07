---
phase: 1
title: "Critical production bug fixes"
status: pending
priority: P0
effort: 4-6h
blocks: none
---

# Phase 1 — Critical production bug fixes

3 bugs đang ship production phải fix trước mọi visual polish.

## Bug 1 — `NaNđ` rendering trong "Tổng dư nợ"

**Symptom:** Field hiển thị literal `NaNđ` khi input/computed value là JS NaN.

**Root cause hypothesis:** Format function nhận undefined/null/empty string → toán tử số học → NaN → format đính suffix `đ`.

**Fix:**
1. Audit grep `formatCurrency|formatVnd|formatMoney|toLocaleString.*VND` toàn `src/`
2. Wrap mọi format function với guard: `if (!Number.isFinite(value)) return "—"`
3. Default placeholder "—" (em dash) thay NaN/null/undefined trong UI
4. Test: feed null/undefined/"" → expect "—", không phải "NaNđ"

**Files affected (estimated):**
- `src/lib/format/currency.ts` (hoặc tương đương — locate trước)
- All consumer components hiển thị `Tổng dư nợ`, `Số tiền vay`, etc.

**Acceptance:**
- Grep `"NaNđ"` toàn screenshots/snapshot tests = 0
- Render KH chưa có loan → "Tổng dư nợ: —" thay vì "NaNđ"

## Bug 2 — `Failed to load mapping.` raw error

**Symptom:** Mapping page hiển thị red text "Failed to load mapping." khi GET /api/report/mapping fail (vd chưa chọn master, network error, etc.).

**Root cause:** Phase 6 cascade: `mappingService.getMapping` throws khi unscoped + no FS fallback. UI catch → set `error` state → render thô.

**Fix:**
1. Locate component render error (`useMappingApi.loadData` set status error)
2. Replace inline red text → empty state component có:
   - Icon (vd `AlertCircle` từ lucide-react)
   - Heading: "Chưa chọn template" hoặc "Không tải được dữ liệu mapping"
   - Description: context cụ thể (eg "Vui lòng chọn template từ thư viện để xem mapping")
   - Retry button (call `loadData` lại)
3. Differentiate error types:
   - Empty scope (no master selected) → guide picker
   - Network error → retry button
   - Server 500 → "Liên hệ admin" + error code

**Files affected:**
- `src/app/report/khdn/mapping/components/mapping-page-content.tsx` (or where error renders)
- New: `src/app/report/khdn/mapping/components/mapping-error-state.tsx` (component mới, tách)

**Acceptance:**
- Trigger GET /api/report/mapping fail → empty state có icon + retry, KHÔNG raw text
- Click retry → loadData re-run, success → flow trở lại bình thường

## Bug 3 — Sidebar collapsed thiếu tooltip + ARIA

**Symptom:** Sidebar thu gọn chỉ icon, không tooltip on hover, không aria-label → screen reader users không biết button nào.

**Root cause:** `<button><Icon /></button>` không có label.

**Fix:**
1. Locate sidebar component (`src/components/sidebar*.tsx`)
2. Khi `collapsed=true`:
   - Add `aria-label={item.label}` (Vietnamese label)
   - Wrap button bằng tooltip primitive (shadcn `Tooltip` hoặc Radix)
3. Show tooltip on hover + focus (keyboard accessible)
4. Test bằng tab key — focus phải show label

**Files affected:**
- `src/components/sidebar.tsx` hoặc `src/components/main-nav.tsx` (locate)
- Possibly: tooltip primitive nếu chưa có

**Acceptance:**
- Hover collapsed icon → tooltip "Trang chủ" / "Khách hàng" / "Hóa đơn" / etc. xuất hiện
- Tab navigation → focus ring visible + tooltip render khi focus
- Screen reader đọc đúng label (test bằng VoiceOver/NVDA optional)

## Implementation order

Sequential (mỗi bug fix + commit riêng):
1. Bug 1 (NaN) — lowest risk, immediate visual win
2. Bug 2 (mapping error) — locate component first, refactor
3. Bug 3 (sidebar tooltip) — verify shadcn tooltip có sẵn hay phải add

## Verify

- `npm run build` clean
- `npm run test` không regression
- Smoke test 3 scenarios: render KH chưa loan / mapping fail / collapsed sidebar hover

## Out of scope (defer)

- Refactor toàn bộ error boundaries app (separate effort)
- Animation tooltip (basic show/hide đủ)
- Re-design empty state graphics (icon đủ)
