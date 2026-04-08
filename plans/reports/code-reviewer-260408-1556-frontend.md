# Frontend Code Review — 2026-04-08

Scope: `src/app/**` (exclude `api/`), `src/components/**`, `src/hooks/**`, `src/stores/**`, `src/lib/**` (client only).
Mode: read-only, pragmatic.

## Overall Assessment

Mature Next.js 15 App Router codebase, kebab-case consistent, zero TODO/FIXME markers, minimal `any` (4 hits in entire scope), DRY wins on customer-new-form sharing. But dense client-side state in editor pages, consistent a11y gaps on modals/forms, silent error catches, and no runtime validation at fetch boundaries. DocxPreviewModal fix verified intact.

---

## Critical

### C1. DocxPreviewModal fix — VERIFIED intact
File: `src/components/docx-preview-modal.tsx`
- `DocxEditorErrorBoundary` (class) catches render crashes, `handleEditorError` catches async viewer errors, `PreviewFallback` renders, `documentBuffer.slice(0)` passes a copy to avoid ArrayBuffer detach. All pieces from the previous fix are present. No action.

### C2. No runtime validation at fetch boundaries
Every page parses `res.json()` then reads fields directly (`data.plan`, `data.ok`, `p.cost_items_json`, etc.) with no zod/guards. An unexpected API shape can silently crash the UI or bypass error states.
- e.g. `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:98-146` — `JSON.parse(p.cost_items_json || "[]")` will throw on malformed JSON and fall through to the catch, which swallows into string error — user gets a generic message.
- `src/components/invoice-tracking/disbursement-form-modal.tsx:79` still uses `as any[]` with a wide inline structural type right after — typed twice, once unsafely.

Recommend: add thin zod schemas in `src/lib/api-schemas/*` for each fetch call, or at minimum `safeParse` + narrow guards at the boundary.

---

## Important

### I1. Accessibility — modal dialogs missing ARIA
23 files render `fixed inset-0 z-*` modal overlays, but only **7** declare `role="dialog"` / `aria-modal="true"`. Only `src/components/ui/base-modal.tsx` is fully wired with escape/backdrop/focus.
Missing (examples):
- `src/components/invoice-tracking/invoice-form-modal.tsx:93`
- `src/components/invoice-tracking/disbursement-form-modal.tsx`
- `src/components/docx-preview-modal.tsx` (line 68 — known gap already logged)
- `src/components/docx-template-editor-modal.tsx`
- 10+ mapping modals under `src/app/report/khdn/mapping/components/modals/*`

Recommend: migrate all ad-hoc modals to `BaseModal` — single source for `role="dialog"`, `aria-modal`, escape-to-close, focus trap, aria-labelledby. YAGNI-compatible: base already exists, just reuse.

### I2. Accessibility — form label association missing project-wide
- Only **5 files** use `htmlFor` in `src/`. Most forms render a `labelCls` styled `<div>`/`<span>` next to an `<input>` without association.
- Screen readers will not announce field names. Legal/compliance risk in a financial product.
- `src/components/suggest-input.tsx` has zero label, no `aria-label`, no combobox role.

Recommend: either wrap inputs inside `<label>` (simplest, no id plumbing), or add `aria-label` on each input. `SuggestInput` also needs `role="combobox"`, `aria-expanded`, `aria-controls` for the listbox.

### I3. State sprawl in loan-plan editor
`src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` (471 LOC)
- **~40 `useState` calls** for a single form. Load path copies each field out of `fin` (L102-143), save path re-packs each one (L178-214). Any schema change = two manual touches, easy to forget (previously documented in `feedback_loan_plan_extended_field_sync.md`).
- `handleSave` conditionally re-packs `trung_dai` / `tieu_dung` branches inline — logic duplicated with load.

Recommend: collapse to a single `useReducer<FormState>` or `useState<Financials>` seeded from server, update via `patch` helper. Removes ~80 lines of wiring and makes field drift a compile error.

### I4. Silent error catches lose user feedback
Pattern repeated 10+ files — e.g. `disbursement-form-modal.tsx:101, 116, 128, 139`:
```
} catch { /* ignore */ }
```
User sees stale/empty state, no indication a fetch failed. Particularly bad for `fetch(/api/loans/.../beneficiaries)` — empty list vs. network failure are indistinguishable.

Recommend: at least `console.warn` + a `setError` variant for non-critical fields; or a shared `toast.warn` for background fetches.

### I5. Oversized files needing modularization (>300 LOC)
Hard limit is 200 per `CLAUDE.md`. Top offenders in scope (rough LOC from content-line count):
| File | LOC |
|---|---|
| `src/app/report/khdn/mapping/components/modals/ai-mapping-modal.tsx` | ~572 |
| `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` | ~471 |
| `src/app/report/customers/[id]/components/collateral-form.tsx` | ~453 |
| `src/components/invoice-tracking/disbursement-form-modal.tsx` | ~418 |
| `src/components/financial-analysis/financial-analysis-modal.tsx` | ~422 |
| `src/app/report/khdn/mapping/components/mapping-page-content.tsx` | ~348 |
| `src/components/customers/customer-docx-import-modal.tsx` | ~335 |
| `src/components/customers/customer-detail-view.tsx` | ~331 |
| `src/components/docx-template-editor-modal.tsx` | ~312 |
| `src/app/report/customers/[id]/components/customer-credit-info-section.tsx` | ~318 |
| `src/app/report/khdn/mapping/components/field-row.tsx` | ~300 |
| `src/app/report/customers/[id]/components/khcn-doc-checklist.tsx` | ~294 |
| `src/app/report/invoices/page.tsx` | ~289 |
| `src/app/report/customers/[id]/components/customer-info-form.tsx` | ~286 |
| `src/app/report/customers/[id]/components/customer-co-borrower-section.tsx` | ~272 |
| `src/components/customers/customer-list-view.tsx` | ~264 |
| `src/components/invoice-tracking/loan-edit-modal.tsx` | ~265 |

`ai-mapping-modal.tsx` is already partly split into `ai-mapping-tab-*` sub-components but the shell itself holds the state of all 4 tabs — split state per tab into custom hooks.
`loan-plan-editor/page.tsx` benefits from I3 refactor.
`collateral-form.tsx` + `customer-credit-info-section.tsx` are form-shape duplicates of each other — candidates for generic field renderer.

### I6. Exhaustive-deps suppressions hiding potential bugs
6 files disable `react-hooks/exhaustive-deps`:
- `src/app/report/loans/new/page.tsx:52` — `useEffect(..., [])` fetches loan plan and writes to `purpose` state (read as closure). OK if effect truly runs once, but brittle.
- `src/components/invoice-tracking/loan-edit-modal.tsx:89` — `[customerId]` only, likely stale state inside.
- `src/app/report/khdn/mapping/hooks/useMappingEffects.ts` — 2 suppressions; please document reason inline.

Recommend: each suppression needs a one-line comment explaining *why* the missing dep is intentional; otherwise convert to proper deps.

---

## Nice-to-have

### N1. `any` leaks (minor)
Only 4 in scope, easy wins:
- `src/app/report/khdn/mapping/hooks/useMappingComputed.ts:16` — `versions: any[] | undefined` — type exists elsewhere, import it.
- `src/app/report/khdn/mapping/hooks/useAiOcrActions.ts:16-17` — `handleApplyBkImport(payload: any)`, `runSmartAutoBatch(input: any)`.
- `src/components/invoice-tracking/disbursement-form-modal.tsx:79` — remove inline `any[]`, reuse `BeneficiaryLinePayload` type.
- `src/components/customers/customer-detail-view.tsx` — 2 hits (not inspected).

### N2. `SuggestInput` filters on every render
`src/components/suggest-input.tsx:19` filters full suggestion list every render. Fine for <200 items, but `savedBeneficiaries` etc. can grow. Wrap in `useMemo([value, suggestions])` once.

### N3. `onBlur` 200 ms timeout in SuggestInput
`src/components/suggest-input.tsx:31` — classic but fragile; switch to `onMouseDown` pattern only (already used for options) or use `relatedTarget` check.

### N4. Dead component candidates
- `src/app/report/customers/new/page.tsx` — redirects to `khdn/customers/new`. Once all links are migrated, delete this page + `report/customers/[id]`. Out of scope to decide, but flag.

### N5. DOM event buses for cross-component sync
`window.addEventListener` / `dispatchEvent` used in 11 files (mapping layer). This is a code smell when Zustand stores already exist — prefer store subscriptions. Specific culprit chains are inside `useMappingEffects.ts` + `mapping-sidebar.tsx`.

### N6. Hardcoded Vietnamese strings bypassing i18n
Many error strings like `"Lỗi tải dữ liệu"`, `"AI phân tích thất bại"` in page files, bypassing `useLanguage()`. Not breaking — project is VN-first — but inconsistent with existing `t()` usage in the same files.

---

## Positive Observations

- DRY: `customer-new-form` now shared between khcn/khdn routes (fixes prior review gap).
- Kebab-case file names, consistent.
- `BaseModal` exists and handles a11y correctly — the fix is "use it".
- Zustand stores split by concern, `partialize` used correctly for persistence.
- Zero `eval`, one justified `dangerouslySetInnerHTML` (theme-flash, documented).
- Error boundary pattern in DocxPreviewModal is textbook.
- Zero TODO/FIXME markers — high discipline.
- `useCallback` + `useMemo` used consistently in the loan-plan editor despite its size.

---

## Recommended Actions (priority order)

1. **[I3]** Refactor `loan-plans/[planId]/page.tsx` to single state object / reducer — eliminates recurring "forgot to sync field" class of bugs.
2. **[I1 + I2]** A11y sweep: migrate custom modals to `BaseModal`, add label association. Can batch into one PR per feature area (invoice-tracking, mapping, customers).
3. **[C2]** Define zod schemas per fetch endpoint in a shared location; wrap responses with `safeParse`.
4. **[I4]** Replace silent catches with logged toast warnings for background fetches.
5. **[I5]** Modularize top 5 oversized files — break into feature-local hook + presentational components.
6. **[I6]** Audit exhaustive-deps suppressions — either fix deps or add `// reason:` comment.
7. **[N1]** Kill remaining `any` — trivial.

---

## Metrics

- Files reviewed (scope): ~350 `.ts`/`.tsx`
- `any` occurrences: 4 in scope (plus 2 in customer-detail-view unchecked)
- Files >200 LOC: ~25 in scope
- Files >400 LOC: 5 in scope
- Modal divs without `role="dialog"`: 16/23
- `htmlFor` usage: 5 files (of ~100+ forms)
- Silent catch blocks: 10+ occurrences
- Exhaustive-deps suppressions: 6 files
- DocxPreviewModal RangeError fix: intact

---

## Unresolved Questions

1. Is `src/app/report/customers/new` route still reachable externally, or safe to delete?
2. Are the 6 `exhaustive-deps` suppressions intentional (tested edge cases) or historical drift? Git blame would clarify.
3. Does the team plan to introduce zod at the API boundary, or stick with TS-only types and trust the server? (Relevant to sizing C2.)
4. Should `loan-plan-editor` form state migration wait for upcoming KHCN/KHDN split, or land standalone?
5. `BaseModal` migration — is there any modal with truly unique behavior (editor frame? docx preview size constraints?) that justifies staying custom?
