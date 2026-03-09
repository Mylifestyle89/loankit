# Phase 3: Template API Route Protection

## Overview
- Priority: P1
- Status: complete
- Effort: 1.5h
- Depends on: Phase 2

Add auth guards + ownership checks to all template API routes. ✓ DONE

## Key Insights
- Currently only `POST /api/report/mapping-instances` has `requireAdmin`
- All other template routes are UNPROTECTED — anyone with session cookie can CRUD
- GET routes: keep open for all authenticated users (viewer can read)
- POST/PUT/PATCH/DELETE: require editor or admin
- For MappingInstance and FieldTemplateMaster write ops: set `createdBy` from session on create, check ownership on update/delete

## Permission Matrix

| Route | Method | Current Auth | New Auth |
|-------|--------|-------------|----------|
| `/api/report/field-templates` | GET | none | requireSession |
| `/api/report/field-templates` | POST | none | requireEditorOrAdmin + set createdBy |
| `/api/report/field-templates` | PUT | none | requireOwnerOrAdmin (lookup createdBy) |
| `/api/report/field-templates` | PATCH | none | requireEditorOrAdmin |
| `/api/report/master-templates` | GET | none | requireSession |
| `/api/report/master-templates` | POST | none | requireEditorOrAdmin + set createdBy |
| `/api/report/master-templates` | PUT | none | requireOwnerOrAdmin (lookup createdBy) |
| `/api/report/master-templates/[id]` | DELETE | none | requireOwnerOrAdmin (lookup createdBy) |
| `/api/report/mapping-instances` | GET | none | requireSession |
| `/api/report/mapping-instances` | POST | requireAdmin | requireEditorOrAdmin + set createdBy |
| `/api/report/mapping-instances/[id]` | GET | none | requireSession |
| `/api/report/mapping-instances/[id]` | PUT | none | requireOwnerOrAdmin |
| `/api/report/mapping-instances/[id]` | PATCH | none | requireOwnerOrAdmin |
| `/api/report/mapping-instances/[id]` | DELETE | none | requireOwnerOrAdmin |
| `/api/report/template` | GET | none | requireSession |
| `/api/report/template` | POST | none | requireEditorOrAdmin |
| `/api/report/template` | PATCH | none | requireEditorOrAdmin |
| `/api/report/template` | DELETE | none | requireEditorOrAdmin |

## Related Code Files

### Modify
- `src/app/api/report/field-templates/route.ts`
- `src/app/api/report/master-templates/route.ts`
- `src/app/api/report/master-templates/[id]/route.ts`
- `src/app/api/report/mapping-instances/route.ts`
- `src/app/api/report/mapping-instances/[id]/route.ts`
- `src/app/api/report/template/route.ts`

### May need to modify (for ownership lookup)
- `src/services/report/master-template.service.ts` — add method to get createdBy
- `src/services/report/mapping-instance.service.ts` — already has getMappingInstance

## Implementation Steps

1. **For each route file**, add auth guard imports:
   ```typescript
   import { requireSession, requireEditorOrAdmin, requireOwnerOrAdmin, handleAuthError } from "@/lib/auth-guard";
   ```

2. **GET handlers**: Add `requireSession()` at top of try block
   ```typescript
   export async function GET(req: NextRequest) {
     try {
       await requireSession();
       // ... existing logic
     } catch (error) {
       const authResp = handleAuthError(error);
       if (authResp) return authResp;
       // ... existing error handling
     }
   }
   ```

3. **POST handlers (create)**: Use `requireEditorOrAdmin()`, pass `session.user.id` as createdBy
   - `field-templates/route.ts` POST: add `createdBy` param to service call
   - `master-templates/route.ts` POST: add `createdBy` param to service call
   - `mapping-instances/route.ts` POST: change `requireAdmin` to `requireEditorOrAdmin`

4. **PUT/PATCH/DELETE handlers (modify/delete)**: Use ownership check
   - Lookup resource first to get `createdBy`
   - Call `requireOwnerOrAdmin(resource.createdBy)`
   - Pattern:
   ```typescript
   const resource = await service.getById(id);
   await requireOwnerOrAdmin(resource.createdBy);
   ```

5. **Update services** to accept and store `createdBy`:
   - `reportService.createFieldTemplate()` — accept createdBy, pass to Prisma create
   - `reportService.createMasterTemplate()` — accept createdBy, pass to Prisma create
   - Check service files to see exact method signatures

6. **`/api/report/template` routes**: These manage template profiles (DOCX templates).
   - No per-record ownership model here — use role-based only (requireEditorOrAdmin for write ops)

## Todo List
- [x] Add auth guards to field-templates route (GET/POST/PUT/PATCH)
- [x] Add auth guards to master-templates route (GET/POST/PUT)
- [x] Add auth guard to master-templates/[id] DELETE
- [x] Update mapping-instances POST from requireAdmin to requireEditorOrAdmin
- [x] Add auth guards to mapping-instances/[id] (GET/PUT/PATCH/DELETE)
- [x] Add auth guards to template route (GET/POST/PATCH/DELETE)
- [x] Update service methods to accept createdBy on create
- [x] Test: viewer gets 403 on POST/PUT/DELETE
- [x] Test: editor can create and edit own resources
- [x] Test: editor gets 403 editing other's resources
- [x] Test: admin can edit any resource

## Success Criteria
- All template routes require authentication
- Write operations require editor or admin role
- Editor can only modify own resources (ownership check)
- Admin bypasses ownership checks
- Viewer is read-only
- No regression in existing functionality

## Risk Assessment
- Medium: touching many route files — risk of breaking existing flows
- Mitigation: add auth in try/catch with `handleAuthError`, preserving existing error handling
- Edge case: existing MappingInstance records have `createdBy: "web-user"` — editors won't own these (admin can still manage)
- Edge case: FieldTemplateMaster records will have `createdBy: "system"` — same mitigation

## Security Considerations
- All write operations behind role check
- Ownership verified server-side, not client-side
- Session validated via Better Auth (cookie + DB check)
