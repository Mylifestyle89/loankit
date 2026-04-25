# Efficiency Review — Disbursement Field Suggestions

**Date:** 2026-04-03
**Files reviewed:**
- `src/components/suggest-input.tsx`
- `src/services/disbursement.service.ts` — `getFieldSuggestions()`
- `src/components/invoice-tracking/disbursement-form-modal.tsx`
- `src/app/api/loans/[id]/disbursement-suggestions/route.ts`

---

## 1. Service — Query Pattern (3 sequential queries)

**Finding: 2 queries có thể collapse thành 1, nhưng lợi ích nhỏ.**

Hiện tại:
```
Query 1: loan.findUnique({ id: loanId }) → lấy customerId
Query 2: loan.findMany({ customerId }) → lấy danh sách sibling loanIds
Query 3: disbursement.findMany({ loanId: { in: loanIds } }) → lấy rows
```

Query 1 và Query 2 có thể hợp thành 1 bằng cách dùng Prisma relation:

```ts
// Thay thế Q1 + Q2 bằng:
const customer = await prisma.loan.findUnique({
  where: { id: loanId },
  select: { customerId: true, customer: { select: { loans: { select: { id: true } } } } },
});
```

Hoặc đơn giản hơn, bỏ hoàn toàn Q2, dùng subquery qua relation:

```ts
const rows = await prisma.disbursement.findMany({
  where: { loan: { customerId: loan.customerId } },
  select: { principalSchedule: true, interestSchedule: true, purpose: true },
});
```

Cách này collapse Q2 + Q3 thành 1 query, tổng còn 2 (Q1 + Q_disbursement).

**Mức độ:** Medium. Đây là endpoint non-critical (suggestion-only, fire-and-forget). Database roundtrip tiết kiệm được là 1 query/call. Với số lượng loan/customer không lớn, impact thực tế thấp nhưng pattern sạch hơn.

**Không có N+1 thực sự** — 3 queries cố định bất kể số lượng records.

---

## 2. SuggestInput — `filtered` recomputed mỗi render

**Finding: Đáng memoize với `useMemo`, nhưng mức độ thấp.**

```tsx
// Hiện tại: chạy lại mỗi render
const filtered = suggestions.filter((s) =>
  s.toLowerCase().includes(value.toLowerCase())
);
```

Vấn đề cụ thể:
- `value.toLowerCase()` tạo string mới mỗi lần gọi — có thể cache riêng.
- `suggestions.filter(...)` duyệt toàn bộ mảng mỗi render kể cả khi `suggestions` và `value` không đổi.
- Trong modal này `suggestions` là static array được fetch 1 lần, không thay đổi — nhưng `SuggestInput` không có cách biết điều đó.

Với `useMemo`:
```tsx
const filtered = useMemo(
  () => suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())),
  [suggestions, value]
);
```

**Mức độ:** Low. `suggestions` array trong context này nhỏ (vài chục entries tối đa). Filter O(n) trên array nhỏ không đo được. Tuy nhiên nếu `SuggestInput` được tái dùng ở form có nhiều field và nhiều re-render (e.g., live typing trong form lớn), memoize là đúng.

---

## 3. useEffect trong modal — Fire-and-forget, dependency chính xác

**Finding: Behavior đúng, không có stale closure hay double-fetch trong production.**

```tsx
useEffect(() => {
  (async () => {
    try {
      const res = await fetch(`/api/loans/${loanId}/disbursement-suggestions`);
      const data = await res.json();
      if (data.ok) setFieldSuggestions(data.suggestions);
    } catch { /* ignore */ }
  })();
}, [loanId]);
```

Phân tích:
- Dependency `[loanId]` — `loanId` là prop, không đổi trong lifetime của modal (modal unmount và mount lại khi `loanId` thay đổi). Fetch đúng chỉ chạy 1 lần khi mount.
- `loanId` được capture đúng tại thời điểm effect chạy — không có stale closure vì IIFE async dùng `loanId` từ outer scope, React đảm bảo giá trị mới nhất tại thời điểm effect schedule.
- **Potential issue với React Strict Mode (dev only):** Effects chạy 2 lần trong Strict Mode → 2 fetches. Không có cleanup (AbortController) nên request thứ 2 cũng gọi `setFieldSuggestions` — kết quả là idempotent (overwrite cùng data), không crash nhưng lãng phí 1 request trong dev. Đây là behavior chấp nhận được cho non-critical suggestion endpoint.
- Không có memory leak từ fetch: nếu component unmount trước khi fetch xong, `setFieldSuggestions` sẽ gọi trên unmounted component → React 18 đã bỏ warning này, không crash. Tuy nhiên để clean hơn nên dùng `AbortController`.

**Mức độ:** Low (chỉ là dev mode concern). Không cần fix bắt buộc.

---

## 4. Memory Leak — `setTimeout` trong SuggestInput

**Finding: Không có leak trong luồng bình thường, nhưng có gap nhỏ.**

```tsx
onBlur={() => setTimeout(() => setOpen(false), 200)}
```

Vấn đề:
- Nếu component unmount trong vòng 200ms sau khi blur (e.g., user đóng modal ngay sau khi click ra ngoài input), `setTimeout` callback vẫn chạy và gọi `setOpen(false)` trên component đã unmount.
- React 18 không crash với setState trên unmounted component nữa, nhưng đây là pattern không sạch.
- Không có `clearTimeout` trong cleanup — không phải leak bộ nhớ thực sự vì setTimeout là one-shot, nhưng là dangling timer.

Cách fix sạch là dùng `useEffect` cleanup:
```tsx
const blurTimerRef = useRef<ReturnType<typeof setTimeout>>();
onBlur={() => { blurTimerRef.current = setTimeout(() => setOpen(false), 200); }}
// cleanup trong useEffect: return () => clearTimeout(blurTimerRef.current);
```

**Mức độ:** Low. Không gây crash hay leak thực sự trong React 18. Pattern phổ biến và được chấp nhận cho dropdown UX.

---

## Tổng kết

| # | Vấn đề | Mức độ | Ảnh hưởng thực tế |
|---|--------|--------|-------------------|
| 1 | 3 queries có thể là 2 bằng relation join | Medium | Thấp — 1 roundtrip/call, non-critical path |
| 2 | `filtered` recompute mỗi render không có useMemo | Low | Không đo được với array nhỏ |
| 3 | Không có AbortController trong fetch effect | Low | Chỉ ảnh hưởng dev Strict Mode |
| 4 | setTimeout không có clearTimeout | Low | Không crash React 18, pattern phổ biến |

**Không có vấn đề nghiêm trọng.** Codebase hoạt động đúng. Vấn đề cấp cao nhất (Medium) là pattern 3-query trong service — có thể refactor khi cần tối ưu.

---

## Câu hỏi chưa giải quyết

- Không có cache layer (e.g., React Query, SWR) cho suggestions endpoint — nếu modal mở/đóng nhiều lần trong cùng session, fetch sẽ lặp lại. Có cần cache ở component level không?
- `AbortController` cleanup có nên áp dụng thống nhất cho tất cả fire-and-forget fetches trong modal không (có 4 useEffect fetch tổng cộng)?
