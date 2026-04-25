# Code Reuse Review - Customer & Loan Plan Changes

## Scope
- 8 changed files, 15 new files
- Focus: duplicate utilities, repeated patterns, shared component opportunities

---

## Findings

### 1. CRITICAL - `inputCls` defined 10+ times across codebase

Shared version exists at `src/components/invoice-tracking/form-styles.ts:3` but is NOT used by any of the changed/new files.

| File | Line | Notes |
|------|------|-------|
| `src/app/report/customers/new/page.tsx` | 9 | Has `mt-1` prefix, slightly different |
| `src/app/report/customers/[id]/page.tsx` | 43 | Same as new/page.tsx |
| `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` | 13 | No `mt-1`, no `transition-all duration-150` |
| `src/app/report/customers/[id]/loan-plans/new/page.tsx` | 25 | Has `mt-1`, same as customers/new |
| `src/app/report/customers/[id]/loan-plans/[planId]/cost-items-table.tsx` | 8 | Completely different (transparent bg, no border styling) |
| `src/app/report/loans/new/page.tsx` | 70 | Uses `rounded-lg` vs `rounded-md` |

**Action:** Consolidate into `form-styles.ts` or a new `src/components/ui/form-classes.ts`. The `cost-items-table.tsx` variant is different enough to keep separate.

### 2. HIGH - `fmtVND()` duplicated 3 times

| File | Line | Implementation |
|------|------|---------------|
| `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` | 15 | `n.toLocaleString("vi-VN") + "d"` |
| `src/app/report/customers/[id]/loan-plans/page.tsx` | 31 | Identical |
| `src/services/email.service.ts` | 43 | Server-side variant |

Existing utility `fmtDisplay` at `src/lib/invoice-tracking-format-helpers.ts:29` does the same thing without the "d" suffix. Could add a `fmtVND` export there.

### 3. HIGH - Customer form markup duplicated between new/page.tsx and [id]/page.tsx

`src/app/report/customers/new/page.tsx` (lines 109-165) and `src/app/report/customers/[id]/page.tsx` (lines 217-273) contain nearly identical form fields:
- Same `<label>` + `<input>` blocks for customer_code, customer_name, address
- Same corporate-only fields (main_business, charter_capital, legal_rep, org_type)
- Same individual-only fields (cccd, date_of_birth, phone)
- Same submit/cancel button styling

**Action:** Extract a `<CustomerForm>` component with `mode: "create" | "edit"` prop.

### 4. MEDIUM - `costItemSchema` + `revenueItemSchema` duplicated in API routes

`src/app/api/loan-plans/route.ts` (lines 10-23) and `src/app/api/loan-plans/[id]/route.ts` (lines 10-23) define identical Zod schemas.

**Action:** Move to `src/lib/loan-plan/loan-plan-schemas.ts` or co-locate in `loan-plan.service.ts`.

### 5. MEDIUM - `METHOD_OPTIONS` / `METHOD_LABELS` duplicated

| File | Line | Type |
|------|------|------|
| `src/app/report/customers/[id]/loan-plans/new/page.tsx` | 18 | Array of `{value, label}` |
| `src/app/report/customers/[id]/loan-plans/page.tsx` | 19 | `Record<string, string>` |

Same data, different shape. Should be a single constant in `loan-plan-types.ts`.

### 6. MEDIUM - API error handling boilerplate repeated

The ZodError + authError + httpError pattern is copy-pasted across:
- `src/app/api/customers/route.ts` POST
- `src/app/api/loan-plans/route.ts` POST
- `src/app/api/loan-plans/[id]/route.ts` PUT

Same ~12 lines each time. Could extract a `handleApiError(error, fallbackMsg)` utility.

### 7. MEDIUM - Loading spinner duplicated

The `<div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 ...">` spinner appears in 13+ files. No shared `<Spinner>` component exists.

### 8. LOW - `CATEGORY_LABELS` in loan-plans/new/page.tsx

Only used once currently. Not a reuse issue yet, but if template categories appear elsewhere, should be shared.

### 9. LOW - Gradient heading class repeated

`bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent` appears in every page header across all changed files. Could be a Tailwind `@apply` utility or a `<GradientHeading>` component.

---

## Summary

| Priority | Count | Key Action |
|----------|-------|------------|
| Critical | 1 | Consolidate `inputCls` into shared module |
| High | 2 | Extract `fmtVND` utility; extract `<CustomerForm>` component |
| Medium | 4 | Shared Zod schemas, method labels, API error handler, spinner |
| Low | 2 | Category labels, gradient heading |

## Unresolved Questions
- Should `form-styles.ts` move from `invoice-tracking/` to `components/ui/` since it's used project-wide?
- Should the `mt-1` variant be a separate export or handled via className merge?
