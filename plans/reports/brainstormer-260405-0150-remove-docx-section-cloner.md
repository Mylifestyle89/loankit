# Brainstorm: Xoá docx-section-cloner (Dead Code Removal)

**Date:** 2026-04-05
**Status:** Recommendation ready

## Problem Statement

Hệ thống có 2 cơ chế render nhiều TSBD trong DOCX:
1. **Section Cloning** (`docx-section-cloner.ts`): Clone body XML N lần, rewrite prefix
2. **Loop arrays** (docxtemplater): Data builders emit indexed fields + `[#TSBD]...[/TSBD]` loops

100% asset templates (65+ entries) đều `noClone: true` → cloner KHÔNG BAO GIO chạy trong production. Dead code.

## Options Evaluated

### Option A: Xoá hoàn toàn (RECOMMENDED)

**Pros:**
- Loại bỏ ~260 LOC dead code (cloner 141 + tests ~100 + references ~20)
- Giảm cognitive load — dev mới không cần hiểu 2 cơ chế
- Loại bỏ `noClone` field trên 65+ template entries (giảm noise)
- Xoá `CATEGORY_TO_PREFIX`, `CATEGORY_TO_COLLATERAL_TYPE` mapping tables (ko còn ai dùng)
- YAGNI thuần tuý: code không chạy = code không cần

**Cons:**
- Nếu tương lai cần clone lại → phải viết lại (git history vẫn giữ)
- Effort: ~1-2 giờ (low risk refactor)

**Risk:** THẤP. Đã confirm 100% templates noClone. Logic cloner chỉ trigger khi `!noClone && count > 1`. Không có external consumer nào khác.

### Option B: Đảo default (opt-in clone)

**Pros:**
- Giữ safety net nếu có template cũ chưa migrate

**Cons:**
- Vẫn giữ ~260 LOC dead code — vi phạm YAGNI
- `noClone` field vẫn tồn tại trên 65 entries
- Complexity không giảm
- Không có template nào cần clone — safety net cho cái không tồn tại

**Verdict:** Không hợp lý. Không có template nào thiếu `noClone`, không có lý do giữ.

### Option C: Deprecate + warning

**Pros:**
- Transition nhẹ nhàng

**Cons:**
- Thêm code (warning logic) cho feature đã dead
- Kéo dài tech debt thay vì giải quyết
- Runtime warning cho condition không bao giờ xảy ra

**Verdict:** Over-engineering cho dead code.

## Final Recommendation: Option A

**Rationale:** YAGNI + KISS. Code không chạy, không có consumer, 100% confirmed dead. Git history giữ backup nếu cần khôi phục.

### Files to modify

| File | Action | LOC delta |
|---|---|---|
| `src/lib/docx-section-cloner.ts` | DELETE | -141 |
| `src/lib/__tests__/docx-section-cloner.test.ts` | DELETE | ~-100 |
| `src/services/khcn-report-data-builder.ts` | Remove import + re-export of cloner symbols | -3 |
| `src/services/khcn-report.service.ts` | Remove cloner imports, simplify `generateKhcnReport()` (lines 38-52) | -15 |
| `src/lib/loan-plan/khcn-template-registry.ts` | Remove `noClone` from `KhcnDocTemplate` type | -2 |
| `src/lib/loan-plan/khcn-asset-template-registry.ts` | Remove `noClone: true` from all 65 entries | ~0 (property removal) |

### Simplified generateKhcnReport() after cleanup

```typescript
export async function generateKhcnReport(
  customerId: string,
  templatePath: string,
  templateLabel: string,
  loanId?: string,
  overrides?: Record<string, string>,
): Promise<KhcnReportResult> {
  const data = await buildKhcnReportData(customerId, loanId, overrides);
  flattenUncPlaceholders(data, overrides);
  const buffer = await docxEngine.generateDocxBuffer(templatePath, data);
  // ... filename + return
}
```

Lines 36-52 (template lookup, category check, prefix, collateralType, noClone, count, preProcessZip) ALL removed.

### Success Criteria
- Build passes, no compile errors
- All existing tests pass (minus deleted cloner tests)
- DOCX generation với multi-asset data vẫn hoạt động bình thường (loop arrays handle it)
- `noClone` không xuất hiện trong codebase

### Implementation Risk: LOW
- Pure dead code removal — no behavior change
- No runtime path affected (cloner never executes)
- Rollback: trivial via git revert

## Unresolved Questions
None — analysis is conclusive. All templates confirmed `noClone: true`.
