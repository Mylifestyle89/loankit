# Code Review: KHCN Module Implementation

**Date:** 2026-03-11 | **Branch:** KHCN-implement | **Reviewer:** code-reviewer

## Scope
- Files: 11 (4 new, 7 modified)
- Focus: Collateral CRUD, KHCN report generation, customer detail page tabs

## Overall Assessment
Solid implementation. Clean UI code, proper Prisma usage (no SQL injection risk). Main concerns: **missing authorization on PATCH/DELETE**, **no error handling on client fetch calls**, and **file size on collateral section** (309 lines).

---

## Critical Issues

### 1. PATCH/DELETE collateral: no ownership verification
**File:** `src/app/api/customers/[id]/collaterals/[collateralId]/route.ts`

PATCH and DELETE ignore the `id` (customerId) param entirely. Any user can modify/delete any collateral by guessing the collateralId. An attacker can PATCH collateral belonging to another customer.

**Fix:** Add `where: { id: collateralId, customerId: id }` or verify ownership before mutating:
```ts
const { id, collateralId } = await ctx.params;
// PATCH
const collateral = await prisma.collateral.update({
  where: { id: collateralId, customerId: id }, // Compound filter
  data,
});
// DELETE
await prisma.collateral.delete({ where: { id: collateralId, customerId: id } });
```

### 2. templatePath from client is passed directly to filesystem
**File:** `src/app/api/report/templates/khcn/generate/route.ts` line 14, `src/services/khcn-report.service.ts` line 178

`templatePath` comes from client body and is passed to `docxEngine.generateDocxBuffer(templatePath, data)`. If docxEngine reads from filesystem, this is a **path traversal** vulnerability. Attacker could send `../../etc/passwd` or similar.

**Fix:** Validate templatePath against a whitelist or ensure it resolves within the templates directory:
```ts
const resolved = path.resolve(TEMPLATES_DIR, templatePath);
if (!resolved.startsWith(TEMPLATES_DIR)) {
  return NextResponse.json({ ok: false, error: "Invalid template path" }, { status: 400 });
}
```

---

## High Priority

### 3. No try-catch on client-side fetch calls
**Files:** `customer-collateral-section.tsx` lines 103-107, 183; `khcn-doc-checklist.tsx` line 81 (empty catch)

`handleSave()` and `handleDelete()` in CollateralForm/CollateralRow have no try-catch. Network errors will cause unhandled promise rejections and leave UI in loading state.

**Fix:** Wrap in try-catch, show error toast, reset loading state in `finally`.

### 4. `customer-collateral-section.tsx` exceeds 200-line limit (309 lines)
Per project rules, files should be under 200 lines. Extract `CollateralForm` and `CollateralRow` into separate files.

### 5. `properties` spread into template data without sanitization
**File:** `khcn-report.service.ts` line 131: `...props` spreads arbitrary JSON keys into the DOCX data dict. If `properties_json` contains keys like `__proto__` or collides with existing data keys (e.g., "Tên khách hàng"), it could corrupt report output.

**Fix:** Filter props to only known PROPERTY_FIELDS keys before spreading.

---

## Medium Priority

### 6. `total_value` uses Float — precision loss for VND amounts
Prisma `Float` maps to double-precision floating point. Vietnamese dong amounts can lose precision at large values. Consider `Decimal` or store as integer (dong, not thousands).

### 7. No input validation for `collateral_type` on API
**File:** `src/app/api/customers/[id]/collaterals/route.ts` line 33

Only checks `collateral_type` is truthy, not that it's one of the valid enum values. Malicious input accepted.

### 8. Hardcoded loan selection in templates tab
**File:** `src/app/report/customers/[id]/page.tsx` line 310: `loanId={customer.loans?.[0]?.id}` always picks first loan. If customer has multiple loans, user cannot select which loan to generate reports for.

---

## Low Priority

### 9. `setTimeout(0)` pattern in loadCustomer effect (line 112)
Still present. Functionally unnecessary — could be removed.

### 10. Checked state in KhcnDocChecklist not persisted
Resets on method change and page navigation. Consider localStorage if persistence desired.

---

## Positive Observations
- Proper abort controller usage in KhcnDocChecklist fetch
- Clean separation of service layer (khcn-report.service) from API route
- Good use of Prisma relations with cascade delete
- Consistent UI styling patterns across new components
- Proper Content-Disposition with UTF-8 filename encoding

---

## Recommended Actions (Priority Order)
1. **[Critical]** Add customerId ownership check to PATCH/DELETE collateral endpoints
2. **[Critical]** Validate/sanitize templatePath against path traversal
3. **[High]** Add try-catch to all client fetch calls in collateral section
4. **[High]** Split collateral section into 3 files (form, row, main)
5. **[High]** Filter property keys in report data builder
6. **[Medium]** Validate collateral_type against allowed enum
7. **[Medium]** Allow loan selection in templates tab for multi-loan customers

## Unresolved Questions
- Does `docxEngine.generateDocxBuffer` do its own path validation? If yes, critical issue #2 severity drops.
- Is there session/auth middleware applied globally to `/api/customers/*` routes? If yes, the ownership issue is less severe (still IDOR within authenticated users).
