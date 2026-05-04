# Phase 03 — CRITICAL Frontend

## Context
- Report: `plans/reports/code-reviewer-260502-1559-frontend-quality.md` (C1, C2)

## Overview
- **Priority:** P1 (CRITICAL)
- **Status:** pending
- **Description:** Stop silent data loss in collateral form save; eliminate stale-closure timebombs in mapping effects.

## Issues

### F-C1 — `collateral-form.tsx` silent save failure
**File:** `src/app/report/customers/[id]/components/collateral-form.tsx` L119-149

**BEFORE:**
```ts
await fetch(url, { method, ... });
onSaved();
```

**AFTER:**
```ts
const res = await fetch(url, { method, headers: {"content-type":"application/json"}, body: JSON.stringify(payload) });
let data: { ok: boolean; error?: string } = { ok: false };
try { data = await res.json(); } catch { /* non-JSON */ }
if (!res.ok || !data.ok) {
  setError(data.error ?? `Lỗi lưu TSBĐ (HTTP ${res.status}).`);
  return;
}
onSaved();
```
Wrap in `try/catch/finally { setSaving(false) }` if not present.

### F-C2 — `useMappingEffects.ts` eslint-disable hides stale closures
**File:** `src/app/report/khdn/mapping/hooks/useMappingEffects.ts` L34-54

**Approach:** Use `useRef` "latest" pattern — keeps deps honest without re-running effects.

```ts
import { useEffect, useLayoutEffect, useRef } from "react";

const loadDataRef = useRef(loadData);
const loadCustomersRef = useRef(loadCustomers);
const loadAllFieldTemplatesRef = useRef(loadAllFieldTemplates);
const loadFieldTemplatesRef = useRef(loadFieldTemplates);

useLayoutEffect(() => {
  loadDataRef.current = loadData;
  loadCustomersRef.current = loadCustomers;
  loadAllFieldTemplatesRef.current = loadAllFieldTemplates;
  loadFieldTemplatesRef.current = loadFieldTemplates;
});

useEffect(() => { void loadDataRef.current(); }, []);
useEffect(() => { void loadCustomersRef.current(); }, []);
useEffect(() => {
  void loadAllFieldTemplatesRef.current();
  if (selectedCustomerId) void loadFieldTemplatesRef.current(selectedCustomerId);
}, [selectedCustomerId]);
```
Remove all `eslint-disable-next-line react-hooks/exhaustive-deps`.

## Implementation Steps
1. Read full `collateral-form.tsx` L100-160 for context.
2. Apply F-C1 — strict `res.ok` + `data.ok` check, surface error to existing `setError` UI.
3. Read `useMappingEffects.ts` full file (probably <100 LOC).
4. Apply F-C2 ref pattern.
5. Manual test: trigger 500 from mock API → form stays open with error visible.
6. Manual test: change customer rapidly → no stale-data flash (confirms F-I5 still pending but C2 fix is foundation).

## Todo
- [ ] Fix `collateral-form.tsx` handleSave error handling
- [ ] Refactor `useMappingEffects.ts` to ref pattern
- [ ] Remove all 3 `eslint-disable` comments
- [ ] Manual test save failure path
- [ ] Manual test customer switch

## Success Criteria
- `onSaved()` never called when API errors
- No `eslint-disable` for `exhaustive-deps` in `useMappingEffects.ts`
- Locale switch updates loaders correctly

## Risk
- **R1:** Existing flow assumes `onSaved()` always runs to refresh parent — verify parent handles error case (probably already does because `setError` shows banner).
