---
title: "Phase 6 UI cascade + MappingInstance schema drop"
description: "Final cascade: refactor mapping page UI semantic away from MappingInstance, retire 4 legacy services, drop MappingInstance table, FS cleanup."
status: pending-decisions
priority: P1
effort: 3-5d (after UX decisions)
branch: main
parent: plans/260505-1007-phase1-migrate-report-data-layer/phase-06-drop-mapping-instance.md
created: 2026-05-06
---

# Phase 6 UI cascade + schema drop

## Status

**BLOCKED on UX decisions** (see § Unresolved Questions). Backend work from prior session done:
- Commits `a4cd957` · `fe36444` · `d2fb9e9` · `5594a8b`
- Services + API routes accept `master_template_id`/`loan_id`; legacy `mapping_instance_id` translated at boundary
- 4 legacy files (`mapping-instance.service`, `_migration-internals`, `migration-runner`, `migration-state`) still alive — UI is the binding constraint to retire them.

## UX context

Mapping page (`src/app/report/khdn/mapping/`) currently treats "field template" as a polymorphic ID — same store slot holds either a master template id OR a MappingInstance id, distinguished by membership in `allFieldTemplates` vs `fieldTemplates`. Three workflows hinge on instance:

1. **Assign master to customer** → creates `MappingInstance` row (`assignSelectedFieldTemplate`)
2. **Edit instance config** → writes to `MappingInstance.fieldCatalogJson` (`saveEditedFieldTemplate` instance branch)
3. **Promote instance to master** → clones instance config into a new `MasterTemplate` (`promoteToMasterTemplate`)

Phase 6 endgame removes MappingInstance entirely. The above 3 workflows need redesign.

## Phases

### Phase 6f — UX decisions (this plan, blocking)
Decide:
- Q1: Customer ↔ Master assignment model (A/B/C below)
- Q2: Keep `promoteToMasterTemplate`?
- Q3: Add loan selector to mapping page?
- Q4: `assignSelectedFieldTemplate` semantics post-cascade?

### Phase 6g — Store + hook refactor
Once Q1-Q4 answered:
- `use-field-template-store`: drop instance polymorphism; `selectedFieldTemplateId` is master-only
- `use-mapping-data-store`: split selection into `selectedMasterTemplateId` + `selectedLoanId`
- `useMappingApi.loadData/loadFieldValues`: query by `master_template_id` (mapping) + `loan_id` (values)
- `use-mapping-api-mutations.saveDraft`: PUT `master_template_id` + `loan_id`
- `use-field-template-apply.applySelectedFieldTemplate`: drop `mapping_instance_id` query param
- `use-field-template-crud`: rewrite `assignSelectedFieldTemplate`, simplify `saveEditedFieldTemplate` (single branch — master only), delete or rewrite `promoteToMasterTemplate`
- `use-mapping-page-logic`: wire new selection state
- Smoke test mapping page: load → edit → save → export

### Phase 6h — Service deletions
After UI no longer references them:
- Delete `src/services/report/mapping-instance.service.ts`
- Delete `src/services/report/_migration-internals.ts` (no callers left after template-field-mutate refactor below)
- Delete `src/services/report/migration-runner.ts`
- Delete `src/services/report/migration-state.ts`
- Refactor `template-field-mutate.service.attachTemplateToCustomer` — current impl creates MappingInstance; rewrite per Q1 decision (probably: set `loan.masterTemplateId` for matching loans, or just remove entirely)
- Refactor `template-field-list.service` — drop `prisma.mappingInstance.count()` usage map
- Update `report.service.ts` facade (remove `mappingInstanceService` spread)
- Delete `/api/report/mapping-instances/**` directory

### Phase 6i — Schema drop
- Backup prod Turso DB (manual)
- Migration SQL: `DROP TABLE mapping_instance` + cascade FK cleanup on Customer/Loan
- Update `prisma/schema.prisma` — remove `MappingInstance` model + relations
- `npx prisma generate`
- Apply migration local; verify
- Document Turso deploy sequence (SQL first, code after)

### Phase 6e — FS cleanup (separate from MappingInstance, but same final session)
- Refactor `mapping.service.getMapping` legacy fallback → drop the FS branch (only master path remains)
- Refactor `build.service` legacy `BuildSource` mode → drop, build always per-loan
- Delete `src/services/report/build-source.ts` legacy branch (collapse to master-only)
- Delete `src/lib/report/fs-store.ts` + sub-modules + `fs-store-helpers.ts` + `fs-store-mapping-io.ts` + `fs-store-fallback.ts` + `fs-store-state-ops.ts`
- Delete `src/lib/report/file-lock.service.ts`
- Delete `src/lib/report/field-formulas.ts`
- Delete `report_assets/config/field_formulas.json` + `report_assets/**/versions/`
- Update `constants.ts` — remove FS path constants

## Risk

| Risk | Severity | Mitigation |
|---|---|---|
| Mapping page workflow regression on instance/master switch | High | Smoke test step-by-step in Phase 6g |
| Customer-template assignment lost (UX gap) | High | Q1 decision must address; document in user-facing release notes |
| Schema drop breaks Vercel runtime if code lags | High | Deploy sequence per Phase 2 pattern (SQL Turso → code) |
| FS cleanup breaks unscoped build flow | Med | Phase 6e ordering — drop legacy AFTER UI is master-only |
| 6g loan selector UX not designed | Med | If Q3 = no, defer; resolve heuristic newest-active-loan persists |

## Success criteria

- 0 grep hit: `MappingInstance`, `mapping_instance_id`, `mapping-instance.service`, `_migration-internals`, `migration-runner`, `migration-state`, `fs-store`, `file_lock`, `field_formulas.json`
- DB: `mapping_instance` table dropped on local + Turso
- `npx tsc --noEmit` clean
- `npm test` ≥197 tests pass
- Smoke: load customer → pick master → edit → save → export → DOCX byte-identical to pre-cascade for the same dataset
- No backward-compat translator code (`masterAndLoanFromMappingInstance`, `mappingInstanceId` params on services) — all gone

## Unresolved questions

### Q1 — Customer ↔ Master assignment

**Context:** `MappingInstance.customerId` linked customer to a per-customer-tweaked master. After drop:
- **(A) No customer-master assignment** — only `Loan.masterTemplateId` matters. Customer page lists masters via `customer.loans.map(l => l.masterTemplate)`. Simplest, but loses "customer's preferred default template" concept.
- **(B) Derive from loans** — customer has implicit set of masters = union of their loans' masters. UI shows aggregated list. No new schema.
- **(C) `Customer.preferredMasterId`** — add a single FK on Customer for "default template". Loan-level still overrides. Most expressive but adds schema.

### Q2 — `promoteToMasterTemplate`

Current: clones an instance's tweaked config into a brand-new master, retains old instance with original master link.

Post-cascade (no instances): there's no per-customer tweak to clone-up. Options:
- **(a)** Delete the workflow — every edit is to a master directly, "promote" makes no sense
- **(b)** Repurpose as "Duplicate master template" — clone master → master, name = "X (copy)"

### Q3 — Loan selector in mapping page

Mapping/values now scope by `loan_id`. Currently UI scopes by customer + (implicit) selected template. To save values to a specific loan:
- **(a)** Add explicit loan selector on mapping page (list customer's loans, default to newest active)
- **(b)** Keep heuristic newest-active-loan (current Phase 3.5 behavior); selector deferred to Phase 7

### Q4 — `assignSelectedFieldTemplate` rewrite

Current: `POST /api/report/mapping-instances` with `customer_id` + `master_id`.

Post-cascade options:
- **(a)** "Assign master to all of customer's loans": iterate `customer.loans`, set `masterTemplateId` on each. UI: pick master, click "Apply", confirms count
- **(b)** "Assign master to specific loan": after Q3-(a), select loan + master, set `loan.masterTemplateId`. One-loan-at-a-time
- **(c)** Drop the workflow entirely; assignment happens at loan creation/edit page, not mapping page
