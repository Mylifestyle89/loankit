# Phase 03 — Wire SuggestInput into DisbursementFormModal

**Status:** complete
**Priority:** High
**Effort:** Small (~20 LOC thay đổi)
**Depends on:** Phase 01, Phase 02

## Context

File: `src/components/invoice-tracking/disbursement-form-modal.tsx`

Hiện tại 3 trường target dùng `<input type="text">` thuần:
- Line 341: `purpose`
- Line 385: `principalSchedule`
- Line 389: `interestSchedule`

Modal đã có pattern fetch-on-mount (3 `useEffect` hiện tại). Thêm 1 useEffect nữa để fetch suggestions.

## Thay đổi cần làm

### 1. Import SuggestInput

```tsx
import { SuggestInput } from "@/components/suggest-input";
```

### 2. State cho suggestions

```tsx
// Field suggestions from customer's disbursement history
const [fieldSuggestions, setFieldSuggestions] = useState<{
  principalSchedule: string[];
  interestSchedule: string[];
  purpose: string[];
}>({ principalSchedule: [], interestSchedule: [], purpose: [] });
```

### 3. Fetch useEffect (thêm sau 3 useEffect hiện tại)

```tsx
// Fetch field suggestions from customer's disbursement history
useEffect(() => {
  (async () => {
    try {
      const res = await fetch(`/api/loans/${loanId}/disbursement-suggestions`);
      const data = await res.json();
      if (data.ok) setFieldSuggestions(data.suggestions);
    } catch { /* ignore — suggestions are non-critical */ }
  })();
}, [loanId]);
```

**Note:** Silent fail là đúng — suggestions là UX enhancement, không ảnh hưởng core functionality.

### 4. Thay input → SuggestInput

**Mục đích (line ~341):**
```tsx
// Before:
<input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputCls} />

// After:
<SuggestInput
  value={purpose}
  onChange={setPurpose}
  suggestions={fieldSuggestions.purpose}
  className={inputCls}
/>
```

**Định kỳ trả gốc (line ~385):**
```tsx
// Before:
<input type="text" value={principalSchedule} onChange={(e) => setPrincipalSchedule(e.target.value)} className={inputCls} />

// After:
<SuggestInput
  value={principalSchedule}
  onChange={setPrincipalSchedule}
  suggestions={fieldSuggestions.principalSchedule}
  className={inputCls}
/>
```

**Định kỳ trả lãi (line ~389):**
```tsx
// Before:
<input type="text" value={interestSchedule} onChange={(e) => setInterestSchedule(e.target.value)} className={inputCls} />

// After:
<SuggestInput
  value={interestSchedule}
  onChange={setInterestSchedule}
  suggestions={fieldSuggestions.interestSchedule}
  className={inputCls}
/>
```

## Lưu ý

- `SuggestInput` wrap trong `<div className="relative">` nên `<label className="block">` wrapper hiện tại vẫn giữ nguyên — chỉ thay đúng thẻ `<input>`
- `className={inputCls}` pass-through đảm bảo visual nhất quán
- Fetch suggestions chạy cùng lúc với các fetch khác (fire-and-forget, không block UI)
- Không cần thay đổi `Props` interface của modal

## Success Criteria

- 3 trường hiện dropdown khi focus (nếu có suggestions)
- Dropdown filter đúng khi gõ
- Chọn option → giá trị điền vào input
- Form submit vẫn hoạt động bình thường
- Edit mode: suggestions vẫn hiện (không ảnh hưởng giá trị đã có)
- TypeScript compile clean
