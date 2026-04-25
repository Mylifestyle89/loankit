---
phase: 2
title: "Data Migration & Seed"
status: pending
effort: 30m
---

# Phase 2: Data Migration & Seed

## Context
- [Prisma schema - DropdownOption](../../prisma/schema.prisma) - model at line 513
- [Seed file](../../prisma/seed-loan-templates.ts) - existing seed
- Existing flat keys in branch-staff: `approver_title`, `appraiser_title`, `reviewer_title`, `branch_name`

## Overview
Rename existing flat fieldKeys to prefixed format. Seed popular fields with Vietnamese dropdown options.

## Requirements

### Functional
1. Migration: rename 4 existing flat keys → `branch.{key}`
2. Seed ~10 fields with dropdown options per brainstorm spec

### Non-functional
- Idempotent seed (upsert, not create)
- Migration safe: if key already prefixed, skip

## Related Code Files

### Modify
- `src/app/report/customers/[id]/components/customer-branch-staff-section.tsx` - update fieldKey props to `branch.` prefix

### Create
- `prisma/seed-dropdown-options.ts` - seed script for dropdown options
- Migration SQL or Prisma migration for renaming existing keys

## Implementation Steps

### 1. Create migration to rename existing keys
Prisma migration with raw SQL:
```sql
UPDATE dropdown_options SET field_key = 'branch.' || field_key
WHERE field_key IN ('approver_title', 'appraiser_title', 'reviewer_title', 'branch_name')
AND field_key NOT LIKE '%.%';
```

### 2. Update branch-staff fieldKey references
In `customer-branch-staff-section.tsx`, change:
- `approver_title` → `branch.approver_title`
- `appraiser_title` → `branch.appraiser_title`
- `reviewer_title` → `branch.reviewer_title`
- `branch_name` → `branch.branch_name`

### 3. Create seed script
File: `prisma/seed-dropdown-options.ts`
Upsert dropdown options for fields listed in brainstorm:
- `collateral.certificate_name` (3 options)
- `collateral.land_purpose` (4 options)
- `collateral.house_structure` (3 options)
- `credit_agri.debt_group` (5 options)
- `credit_other.debt_group` (5 options)
- `co_borrower.id_type` (3 options)
- `co_borrower.relationship` (4 options)

### 4. Run seed
Add to package.json scripts or run directly: `npx tsx prisma/seed-dropdown-options.ts`

## Todo List
- [ ] Create Prisma migration to rename flat keys → prefixed
- [ ] Update branch-staff section fieldKey props
- [ ] Create seed-dropdown-options.ts with upsert logic
- [ ] Run migration + seed, verify data

## Success Criteria
- No flat keys remain in dropdown_options table
- Branch-staff section still works with prefixed keys
- Seed data visible in all seeded SmartField dropdowns
