# Phase 6: Number-to-Vietnamese-Text Utility

**Priority:** Medium | **Status:** Pending | **Effort:** S

## Utility: `src/lib/number-to-vietnamese-text.ts`

Convert number → Vietnamese text for currency display.

```typescript
export function numberToVietnameseText(n: number): string
// 1500000 → "Một triệu năm trăm nghìn đồng"
// 200000000 → "Hai trăm triệu đồng"
```

### Rules
- Units: đơn vị, nghìn, triệu, tỷ
- Handle: 0 ("Không đồng"), negative (prefix "Âm")
- "mươi" vs "mười", "lăm" vs "năm", "linh/lẻ" rules
- Append "đồng" suffix
- Capitalize first letter

### Testing
- `src/lib/__tests__/number-to-vietnamese-text.test.ts`
- Edge cases: 0, 1, 10, 11, 15, 100, 1001, 1000000, 1500000000

## Related Files
- `src/lib/number-to-vietnamese-text.ts` (new)
- `src/lib/__tests__/number-to-vietnamese-text.test.ts` (new)
