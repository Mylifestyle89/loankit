# Phase 01 — SuggestInput Generic Component

**Status:** complete
**Priority:** High
**Effort:** Small (~50 LOC)

## Context

Pattern tham khảo: `src/components/invoice-tracking/beneficiary-section-form.tsx` lines 62-105
- `showSearch` state
- `onFocus` → show, `onBlur` + 200ms delay → hide
- `onMouseDown` (không dùng `onClick`) để tránh blur fire trước
- `filteredSaved` client-side filter

## File tạo

`src/components/suggest-input.tsx`

## Interface

```tsx
type SuggestInputProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];       // Toàn bộ danh sách, filter client-side
  placeholder?: string;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
};
```

Drop-in thay thế `<input type="text">` — không thêm `<label>` wrapper bên trong.

## Behavior

1. User **focus** vào input → hiện dropdown với tất cả `suggestions` (nếu > 0)
2. User **gõ** → filter suggestions: `s.toLowerCase().includes(value.toLowerCase())`
3. User **click option** → `onChange(option)`, đóng dropdown
4. User **blur** → setTimeout 200ms rồi đóng dropdown (cho phép click option)
5. Nếu `suggestions.length === 0` hoặc không có match → không hiện dropdown (không hiện empty state)
6. **Max hiển thị**: 8 items (overflow-auto với max-h)

## Pseudocode

```tsx
export function SuggestInput({ value, onChange, suggestions, placeholder, className, inputMode }: SuggestInputProps) {
  const [open, setOpen] = useState(false);

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#1a1a1a] shadow-lg">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Styling

Reuse exact classes từ beneficiary autocomplete dropdown:
- Dropdown: `absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#1a1a1a] shadow-lg`
- Option button: `w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors`

## Success Criteria

- Component render đúng, không có TypeScript errors
- Dropdown mở khi focus, đóng khi blur
- Filter chạy đúng (case-insensitive)
- Chọn option → value thay đổi đúng
- `className` pass-through hoạt động (có thể dùng `inputCls` từ form-styles)
