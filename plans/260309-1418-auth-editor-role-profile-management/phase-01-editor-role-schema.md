# Phase 1: Editor Role + Prisma Schema

## Overview
- Priority: P1
- Status: complete
- Effort: 30m

Add "editor" role to auth config and add `createdBy` to `FieldTemplateMaster`. ✓ DONE

## Key Insights
- Better Auth admin plugin uses `defaultRole` and `adminRoles` config — custom roles just work as strings
- `MappingInstance` already has `createdBy` field
- `FieldTemplateMaster` lacks `createdBy` — needs migration
- Role comment in schema says `// admin | viewer` — update to include editor

## Requirements
- editor role recognized by Better Auth
- FieldTemplateMaster gets `createdBy` field (String, default "system")
- Existing records get "system" as createdBy (safe default)

## Related Code Files

### Modify
- `prisma/schema.prisma` — add createdBy to FieldTemplateMaster, update role comment
- `src/lib/auth.ts` — no change needed (Better Auth allows any string role)
- `src/app/report/admin/users/page.tsx` — add "editor" to role dropdown in CreateUserForm and toggle

### No changes needed
- `src/lib/auth.ts` — `adminRoles: ["admin"]` stays the same; editor is NOT admin

## Implementation Steps

1. **Update Prisma schema** (`prisma/schema.prisma`)
   - Add to `FieldTemplateMaster`:
     ```prisma
     createdBy      String   @default("system")
     ```
   - Update User.role comment: `// admin | editor | viewer`

2. **Run migration**
   ```bash
   npx prisma migrate dev --name add-editor-role-and-createdby
   ```

3. **Update admin panel role options** (`src/app/report/admin/users/page.tsx`)
   - In `CreateUserForm`: add `<option value="editor">editor</option>` to role select
   - In `UserRow.toggleRole()`: cycle through admin → editor → viewer → admin
   - Update role badge colors: add editor-specific color (e.g., amber/yellow)

## Todo List
- [x] Add createdBy to FieldTemplateMaster in schema.prisma
- [x] Update role comment in User model
- [x] Run prisma migration
- [x] Add "editor" option to CreateUserForm role select
- [x] Update toggleRole to cycle 3 roles
- [x] Add editor badge color styling

## Success Criteria
- `npx prisma migrate` succeeds
- Editor role can be assigned to users via admin panel
- FieldTemplateMaster has createdBy column with "system" default

## Risk Assessment
- Low risk: additive schema change, default value prevents data issues
- SQLite migration with default value is safe for existing rows
