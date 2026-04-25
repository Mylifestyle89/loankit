---
title: "KHCN/KHDN Customer Module Separation"
description: "Split unified customer UI into separate KHCN and KHDN modules with dedicated routes"
status: pending
priority: P1
effort: 6h
branch: Customer-type-modules-refactoring
tags: [refactoring, routing, ui, khcn, khdn]
created: 2026-03-21
---

# KHCN/KHDN Customer Module Separation

## Overview

Split `/report/customers` into `/report/khcn/customers` and `/report/khdn/customers`. DB/API unchanged. UI-only refactor.

## Current Architecture

- `src/app/report/customers/page.tsx` — unified list with `typeFilter` state
- `src/app/report/customers/[id]/page.tsx` — detail page, switches `allTabs` vs `khcnTabs` based on `customer_type`
- `src/app/report/customers/new/page.tsx` — new customer with type toggle
- `src/app/report/khdn/layout.tsx` — existing KHDN tab layout (mapping, template, ai-suggest)
- Sidebar nav in `src/app/report/layout.tsx` — single "Customers" link

## Strategy: Shared Components + Type-Specific Route Wrappers

Instead of duplicating pages, create thin wrapper pages that import shared logic with a fixed `customerType` prop. Shared components stay in `src/app/report/customers/` (or move to `src/components/customers/`).

---

## Phase 1: Extract Shared Customer Components (1.5h)

**Goal:** Make list & detail pages accept `customerType` as prop instead of internal state.

### Steps

1. **Refactor `customers/page.tsx`** — extract core list UI into `CustomerListView` component
   - Props: `{ customerType: "corporate" | "individual"; basePath: string }`
   - Remove `typeFilter` state, hardcode fetch URL with `?type=` param
   - `basePath` controls link targets (e.g., `/report/khcn/customers` vs `/report/khdn/customers`)
   - File: `src/components/customers/customer-list-view.tsx`

2. **Refactor `customers/[id]/page.tsx`** — extract into `CustomerDetailView`
   - Props: `{ customerType: "corporate" | "individual"; basePath: string }`
   - Remove `isIndividual` detection, use prop directly
   - Tab list determined by `customerType` prop
   - File: `src/components/customers/customer-detail-view.tsx`

3. **Refactor `customers/new/page.tsx`** — extract into `CustomerNewForm`
   - Props: `{ customerType: "corporate" | "individual"; basePath: string }`
   - Remove type toggle, fix type from prop
   - File: `src/components/customers/customer-new-form.tsx`

4. Move shared sub-components that are reusable:
   - `customer-export-modal.tsx`, `customer-import-handler.ts` -> `src/components/customers/`
   - Detail components stay in `src/components/customers/detail/` (or keep in place, import from new routes)

### Files to Create
- `src/components/customers/customer-list-view.tsx`
- `src/components/customers/customer-detail-view.tsx`
- `src/components/customers/customer-new-form.tsx`

### Files to Modify
- `src/app/report/customers/page.tsx` (becomes thin wrapper or redirect)
- `src/app/report/customers/[id]/page.tsx` (becomes thin wrapper or redirect)
- `src/app/report/customers/new/page.tsx` (becomes thin wrapper or redirect)

---

## Phase 2: Create KHCN Customer Routes (1.5h)

**Goal:** Add `/report/khcn/customers`, `/report/khcn/customers/[id]`, `/report/khcn/customers/new`

### Steps

1. Create `src/app/report/khcn/customers/page.tsx` — thin wrapper:
   ```tsx
   import { CustomerListView } from "@/components/customers/customer-list-view";
   export default function KhcnCustomersPage() {
     return <CustomerListView customerType="individual" basePath="/report/khcn/customers" />;
   }
   ```

2. Create `src/app/report/khcn/customers/[id]/page.tsx` — same pattern with `CustomerDetailView`

3. Create `src/app/report/khcn/customers/new/page.tsx` — same pattern with `CustomerNewForm`

4. Create `src/app/report/khcn/customers/[id]/loan-plans/` routes — mirror existing structure under `customers/[id]/loan-plans/`

5. **KHCN layout consideration:** Currently no KHCN layout exists at `/report/khcn/`. Need to create `src/app/report/khcn/layout.tsx` with KHCN-specific header/tabs similar to KHDN layout. Tabs: Customers, (future: templates, etc.)

### Files to Create
- `src/app/report/khcn/layout.tsx`
- `src/app/report/khcn/customers/page.tsx`
- `src/app/report/khcn/customers/[id]/page.tsx`
- `src/app/report/khcn/customers/new/page.tsx`
- `src/app/report/khcn/customers/[id]/loan-plans/[planId]/page.tsx`
- `src/app/report/khcn/customers/[id]/loan-plans/new/page.tsx`
- `src/app/report/khcn/customers/[id]/loan-plans/page.tsx`

---

## Phase 3: Create KHDN Customer Routes (1h)

**Goal:** Add `/report/khdn/customers`, `/report/khdn/customers/[id]`, `/report/khdn/customers/new`

### Steps

1. Create `src/app/report/khdn/customers/page.tsx` — wrapper with `customerType="corporate"`

2. Create `src/app/report/khdn/customers/[id]/page.tsx`

3. Create `src/app/report/khdn/customers/new/page.tsx`

4. Update `src/app/report/khdn/layout.tsx` — add "Customers" tab to existing tab bar (mapping, template, ai-suggest, **customers**)

### Files to Create
- `src/app/report/khdn/customers/page.tsx`
- `src/app/report/khdn/customers/[id]/page.tsx`
- `src/app/report/khdn/customers/new/page.tsx`

### Files to Modify
- `src/app/report/khdn/layout.tsx` — add Customers tab

---

## Phase 4: Update Navigation & Cleanup (1.5h)

### Steps

1. **Update sidebar** (`src/app/report/layout.tsx`):
   - Remove single "Customers" link (`/report/customers`)
   - KHCN and KHDN links already exist or add if needed
   - Ensure `/report/khcn` and `/report/khdn` are the two main nav items

2. **Add redirect** from old routes:
   - `src/app/report/customers/page.tsx` -> redirect to `/report/khdn/customers` (or show choice page)
   - `src/app/report/customers/[id]/page.tsx` -> fetch customer type, redirect to appropriate module
   - Option: keep old routes as smart redirects that detect type and redirect

3. **Update all internal links** that reference `/report/customers`:
   - Search codebase for `"/report/customers"` and update
   - Key files: sidebar, breadcrumbs, customer store, any hardcoded links

4. **Clean up dead code:**
   - Remove `typeFilter` state from old list page
   - Remove type toggle from old new-customer page
   - Remove `isIndividual` conditional tab logic from old detail page

### Files to Modify
- `src/app/report/layout.tsx` (sidebar nav)
- `src/app/report/customers/page.tsx` (redirect)
- `src/app/report/customers/[id]/page.tsx` (redirect)
- `src/app/report/customers/new/page.tsx` (redirect)
- Any files referencing `/report/customers` paths

---

## Phase 5: Verify & Test (0.5h)

1. Compile check (`npm run build` or `npx next build`)
2. Verify KHCN routes show only individual customers
3. Verify KHDN routes show only corporate customers
4. Verify old `/report/customers` redirects work
5. Verify loan-plan sub-routes work under new paths
6. Check no broken imports or dead links

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Shared components in `src/components/customers/` | DRY: one source of truth, thin route wrappers |
| `basePath` prop | Links within list/detail stay module-aware without hardcoding |
| Old routes become redirects | Backward compat, no broken bookmarks |
| DB/API unchanged | KISS: only UI routing changes |
| KHCN gets its own layout | Mirrors KHDN structure, room for future KHCN-specific tabs |

## Risk Assessment

- **Broken links:** Mitigate by grepping all `"/report/customers"` references
- **Loan plan sub-routes:** Must mirror full nested structure under new paths
- **Component imports:** Detail page has many sub-components; ensure import paths still resolve

## Todo Checklist

- [ ] Phase 1: Extract shared components
- [ ] Phase 2: KHCN customer routes
- [ ] Phase 3: KHDN customer routes
- [ ] Phase 4: Nav update & cleanup
- [ ] Phase 5: Verify & test
