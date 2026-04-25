# Code Review: DOCX Customer Import Feature

## Scope
- **Files**: 2 NEW + 1 MODIFIED
  - `src/app/api/customers/import-docx/route.ts` (233 lines)
  - `src/components/customers/customer-docx-import-modal.tsx` (371 lines)
  - `src/components/customers/customer-list-view.tsx` (added 2 buttons + state)
- **Focus**: Code quality, error handling, logical correctness, stringly-typed issues

## Overall Assessment
Feature is functionally sound but has **3 HIGH** and **3 MEDIUM** issues around error handling, API response validation, and missing fallback logic. Modal is well-structured with good UX flow, but API route lacks defensive programming.

---

## Critical Issues

### 1. **MISSING ERROR HANDLING in loan/collateral creation** — HIGH
**File**: `customer-docx-import-modal.tsx`, lines 163–200  
**Problem**: After creating customer successfully, loans and collaterals are created via sequential `fetch` calls without error handling. If any call fails, modal shows success but data is partially saved.

```typescript
// Lines 163–177 (loans)
for (const loan of extracted.loans) {
  if (!loan.contract_number && !loan.loan_amount) continue;
  await fetch("/api/loans", {  // ❌ NO try/catch, NO response validation
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({...}),
  });
}
```

**Impact**: User thinks full import succeeded (customer + loans + collaterals) but loans/collaterals may silently fail.

**Fix**:
```typescript
const loanErrors = [];
for (const loan of extracted.loans) {
  if (!loan.contract_number && !loan.loan_amount) continue;
  try {
    const res = await fetch("/api/loans", {...});
    const data = await res.json();
    if (!data.ok) loanErrors.push(`Khoản vay: ${data.error}`);
  } catch (err) {
    loanErrors.push(`Khoản vay: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
if (loanErrors.length > 0) throw new Error(loanErrors.join("; "));
```

---

### 2. **Unvalidated API response structure from Gemini** — HIGH
**File**: `route.ts`, lines 110–131  
**Problem**: `JSON.parse(text)` on line 121 can throw if Gemini returns invalid JSON, or the shape doesn't match `ExtractionResult`. No try/catch wraps the parse.

```typescript
const parsed = JSON.parse(text) as ExtractionResult; // ❌ Can throw
return {
  customer: parsed.customer ?? {},
  loans: Array.isArray(parsed.loans) ? ... // ❌ Late validation
```

**Impact**: Malformed Gemini response crashes the entire route handler instead of returning graceful error.

**Fix**:
```typescript
let parsed: ExtractionResult;
try {
  parsed = JSON.parse(text);
} catch {
  return { customer: {}, loans: [], collaterals: [] };
}
// Validate shape
if (!parsed || typeof parsed !== 'object') {
  return { customer: {}, loans: [], collaterals: [] };
}
```

---

### 3. **Race condition in duplicate CCCD check** — HIGH
**File**: `customer-docx-import-modal.tsx`, lines 104–115  
**Problem**: CCCD duplicate check happens AFTER AI extraction completes, but BEFORE final submit. If user manually changes CCCD during review (edits input field), the warning becomes stale and no re-check happens.

```typescript
// Line 105: Check happens once
if (cccd) {
  const checkRes = await fetch(`/api/customers?type=individual`);
  const checkData = await checkRes.json();
  const dup = checkData.customers?.find((c) => c.cccd === cccd);
  if (dup) setDuplicateWarning(`CCCD "${cccd}" đã tồn tại...`);
}

// User can edit CCCD in review step (line 362) but no re-check
```

**Impact**: User changes CCCD to bypass duplicate warning, submits duplicate silently.

**Fix**: Either re-check CCCD on submit, or disable CCCD field in review step.

---

## High Priority Issues

### 4. **Silent skip of incomplete loans/collaterals** — HIGH
**File**: `customer-docx-import-modal.tsx`, lines 164 & 182  
**Problem**: 
```typescript
if (!loan.contract_number && !loan.loan_amount) continue;  // Line 164
if (!col.name) continue;                                   // Line 182
```

These silently discard items without user feedback. If Gemini extracted 3 loans but 1 was filtered out, user doesn't know.

**Fix**: Count and warn before submit:
```typescript
const emptyLoans = extracted.loans.filter(l => !l.contract_number && !l.loan_amount).length;
if (emptyLoans > 0) {
  // Show warning in review UI, let user decide
}
```

---

### 5. **No response status check after fetch** — MEDIUM
**File**: `customer-docx-import-modal.tsx`, lines 165–177 & 183–199  
**Problem**: Fetch calls don't check `res.ok` or `res.status` before calling `.json()`. Network failures or 4xx/5xx responses won't be caught.

```typescript
await fetch("/api/loans", {...});  // ❌ Don't check status
```

**Fix**:
```typescript
const res = await fetch("/api/loans", {...});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
if (!data.ok) throw new Error(data.error);
```

---

### 6. **Stringly-typed collateral type** — MEDIUM
**File**: `customer-docx-import-modal.tsx`, line 187  
**Problem**: Hard-coded string `"qsd_dat"` without enum/constant check. If schema changes, this breaks silently.

```typescript
collateral_type: String(col.type || "qsd_dat"),  // ❌ String literal
```

**Solution**: Define enum at top:
```typescript
const COLLATERAL_TYPE_DEFAULT = "qsd_dat"; // Reference from shared constants
```

---

## Medium Priority Issues

### 7. **Redundant type casting in loan/collateral submission** — MEDIUM
**File**: `customer-docx-import-modal.tsx`, lines 168–176 & 186–199  
**Problem**: Unnecessary `String()/Number()` casts on already-typed data:

```typescript
contractNumber: String(loan.contract_number || ""),  // Already string? Or is it number?
loanAmount: Number(loan.loan_amount) || 0,           // Type is ambiguous
```

Type inconsistency between `ExtractedLoan` (line 27–34) and submission suggests schema unclear.

**Fix**: Use `as` casts or clarify types in `ExtractedLoan`:
```typescript
type ExtractedLoan = {
  contract_number: string;  // ← Make explicit
  loan_amount: number;      // ← Make explicit
  ...
};
```

---

### 8. **Merge logic allows incomplete collaterals** — MEDIUM
**File**: `route.ts`, lines 159–165  
**Problem**: Collateral dedup only checks `certificate_serial || name`. If both are missing, duplicates slip through:

```typescript
const exists = merged.collaterals.some(
  (c) => (col.certificate_serial && c.certificate_serial === col.certificate_serial) ||
         (col.name && c.name === col.name),
);
if (!exists) merged.collaterals.push(col);  // ❌ Empty cert_serial + empty name both added
```

**Fix**: Require at least one identifier:
```typescript
if (!col.certificate_serial && !col.name) continue;  // Skip anonymous collaterals
```

---

### 9. **Unclear "continue" logic in loan dedup** — MEDIUM
**File**: `route.ts`, lines 151–157  
**Problem**: Logic seems to allow one loan without `contract_number` per merge:

```typescript
if (loan.contract_number && !merged.loans.some((l) => l.contract_number === loan.contract_number)) {
  merged.loans.push(loan);
} else if (!loan.contract_number && merged.loans.length === 0) {
  merged.loans.push(loan);  // ❌ Allows 1 nameless loan only if list empty
}
```

Intent unclear. Better to skip all loans without contract_number:
```typescript
if (!loan.contract_number) continue;
if (merged.loans.some((l) => l.contract_number === loan.contract_number)) continue;
merged.loans.push(loan);
```

---

## Positive Observations

✅ **Good modal UX flow**: Upload → Processing → Review is clean and intuitive  
✅ **Editable fields**: User can correct AI extraction before submit  
✅ **Multi-file support**: Merge logic handles multiple DOCX files  
✅ **Gemini token optimization**: Truncate logic (head 30k + tail 10k) smart  
✅ **Field labels i18n ready**: Extracted into constants, easy to translate  
✅ **BaseModal usage**: Consistent with project UI standards  
✅ **Auth guard**: `requireEditorOrAdmin()` on API route is correct  

---

## Recommended Actions

1. **URGENT**: Wrap loan/collateral creation in try/catch, collect errors, show user total count of failures before final success message.
2. **URGENT**: Add try/catch around `JSON.parse()` in `extractWithGemini()`, return empty result on parse failure.
3. **HIGH**: Re-validate CCCD before submit, or disable field editing in review step.
4. **HIGH**: Show count of skipped (incomplete) loans/collaterals to user; let them decide if OK.
5. **MEDIUM**: Add `res.ok` checks after all fetch calls in modal.
6. **MEDIUM**: Replace hardcoded `"qsd_dat"` with named constant from schema.
7. **MEDIUM**: Simplify loan dedup: skip all loans without contract_number.
8. **MEDIUM**: Clarify types in `ExtractedLoan` — number vs string for `contract_number` and `loan_amount`.

---

## Metrics & Notes

- **LOC**: 604 total (233 API + 371 modal)
- **Type safety**: Partial — ExtractedData/ExtractedLoan types vague on number vs string
- **Error handling**: Missing in 3+ places (Gemini JSON parse, loan/collateral POST, fetch status checks)
- **Test coverage**: No tests added for this feature; recommend regression tests for AI extraction edge cases

---

## Unresolved Questions

1. Should incomplete loans/collaterals skip silently or warn user explicitly?
2. What's the intended behavior if user edits CCCD after AI extraction — should it re-check duplicates?
3. Are `contract_number` and `loan_amount` guaranteed to be strings/numbers, or can they be null/undefined?
4. Should loan/collateral creation be atomic (all-or-nothing) or partial (best-effort)?
