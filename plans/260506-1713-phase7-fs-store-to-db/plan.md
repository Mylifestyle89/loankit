---
title: "Phase 7 — FS-store retirement (TemplateProfile + FrameworkState → DB)"
description: "Final FS cleanup beyond MappingInstance: migrate TemplateProfile + FrameworkState from JSON files to DB; remove fs-store + file-lock + sub-modules."
status: deferred
priority: P2
effort: 2-3d
branch: main
parent: plans/260506-1629-phase6-ui-cascade-and-schema-drop/plan.md
created: 2026-05-06
deferred: 2026-05-07
defer_reason: "Big plan (260505-1007) goal đã đạt với Phase 6 cascade. Phase 7 là internal refactor không user-facing, P2. Pick lại khi có time/priority cụ thể hoặc khi fs-store thực sự cản trở thay đổi mới."
---

# Phase 7 — FS-store retirement

## Status

Phase 6e minimal cleanup shipped (commit pending) — orphan `field-formulas.ts` + `field_formulas.json` + `REPORT_FIELD_FORMULAS_FILE` constant deleted.

Full fs-store removal deferred here because **22 files still depend on `fs-store`** for non-MappingInstance concerns:
- `TemplateProfile` storage (`getActiveTemplateProfile`, list of `.docx` paths)
- `FrameworkState` (`field_catalog`, `active_template_id`, `mapping_versions` history)
- `getActiveMappingVersion` (legacy mapping versioning)

These are independent of MappingInstance and need a separate migration arc.

## What still uses fs-store (audit 2026-05-06)

```
src/lib/report/fs-store.ts                              # the entry barrel
src/lib/report/fs-store-helpers.ts
src/lib/report/fs-store-mapping-io.ts
src/lib/report/fs-store-fallback.ts
src/lib/report/fs-store-state-ops.ts
src/lib/report/file-lock.service.ts
src/lib/report/pipeline-client.ts                       # python pipeline driver
src/services/report/build.service.ts
src/services/report/build-service-bank-export.ts
src/services/report/build-service-freshness.ts
src/services/report/build-source.ts
src/services/report/data-io-export.service.ts
src/services/report/data-io-import.service.ts
src/services/report/field-values.service.ts
src/services/report/mapping.service.ts
src/services/report/master-source.ts (parseMappingJson/parseAliasJson re-export only — easy)
src/services/report/template-field-list.service.ts
src/services/report/template-profile-operations.service.ts
src/services/report/template.service.ts
src/app/api/report/catalog/route.ts
src/lib/report/financial-field-catalog.ts (constant ref only)
src/lib/report/constants.ts (path constants)
```

## Phases

### 7a — Schema for TemplateProfile (DB)

Add `TemplateProfile` model to Prisma:

```prisma
model TemplateProfile {
  id          String   @id @default(cuid())
  templateName String
  docxPath    String
  active      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("template_profiles")
}
```

Migration: load existing `template_profiles` from `framework_state.json` into DB on deploy.

### 7b — Active template profile via DB

- New service method `templateService.getActiveProfile()` reads from DB
- Refactor `getActiveTemplateProfile(state)` callers → `templateService.getActiveProfile()`
- Drop `state.active_template_id` references

### 7c — FrameworkState rationalization

Decide what to do with `state.field_catalog` and `state.mapping_versions`:
- `field_catalog`: source from active master template's `fieldCatalogJson` instead of global state
- `mapping_versions`: drop (master is canonical, no legacy history needed)

After this, `FrameworkState` is essentially empty → delete `loadState`/`saveState` and `framework_state.json`.

### 7d — Pipeline-client decoupling

`pipeline-client.runBuildAndValidate` invokes Python pipeline that reads `mapping_master.json` + `placeholder_alias_2268.json` from disk. Either:
- (a) Have pipeline read from DB via API
- (b) Keep these 2 files as canonical inputs; sync from active master on each build

(b) is pragmatic short-term; (a) is correct long-term.

### 7e — Delete legacy

Once all callers migrated:
- Delete `fs-store.ts`, `fs-store-helpers.ts`, `fs-store-mapping-io.ts` (move parseMappingJson/parseAliasJson to a new lightweight module like `mapping-json-utils.ts`), `fs-store-fallback.ts`, `fs-store-state-ops.ts`
- Delete `file-lock.service.ts` (no remaining users)
- Delete `framework_state.json`, `versions/` dirs in report_assets
- Drop legacy mode in `build-source.ts`, `mapping.service.getMapping`, etc.

## Risk

- TemplateProfile migration on prod (Turso): same deploy sequence pattern (SQL → code)
- Pipeline-client decoupling could break Python integration if not careful — keep file sync as escape hatch

## Success criteria

- 0 grep hit: `loadState`, `fs-store`, `file_lock`, `framework_state.json`
- DB owns TemplateProfile + active profile selection
- 197+ tests pass · tsc clean
- Smoke test: build + export + mapping page all work

## Unresolved questions

- Is the Python pipeline (`pipeline-client.runBuildAndValidate`) still actively used post-Phase 6, or has master-centric DB flow replaced it? If unused, we can defer 7d entirely.
