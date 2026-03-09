# Phase 2: Auth Guard Enhancements

## Overview
- Priority: P1
- Status: complete
- Effort: 45m
- Depends on: Phase 1

Add new guard functions for editor role and ownership checking. ✓ DONE

## Key Insights
- Current guards: `requireSession()` (any logged-in user), `requireAdmin()` (admin only)
- Need: `requireEditorOrAdmin()` (can create/edit), `requireOwnerOrAdmin(resourceCreatedBy)` (ownership check)
- Session object has `session.user.role` and `session.user.id`
- Keep existing guards untouched — add new ones

## Architecture

```
requireSession()          — any authenticated user (existing)
requireAdmin()            — admin only (existing)
requireEditorOrAdmin()    — editor or admin (NEW)
requireOwnerOrAdmin(id)   — admin bypasses, editor must own resource (NEW)
```

## Related Code Files

### Modify
- `src/lib/auth-guard.ts` — add new guard functions

## Implementation Steps

1. **Add `requireEditorOrAdmin()`** to `src/lib/auth-guard.ts`
   ```typescript
   export async function requireEditorOrAdmin() {
     const session = await requireSession();
     if (session.user.role !== "admin" && session.user.role !== "editor") {
       throw new AuthError(403, "Forbidden: editor or admin access required");
     }
     return session;
   }
   ```

2. **Add `requireOwnerOrAdmin()`** to `src/lib/auth-guard.ts`
   ```typescript
   /** Require admin (bypass) or that session user matches resourceOwnerId. */
   export async function requireOwnerOrAdmin(resourceOwnerId: string) {
     const session = await requireSession();
     if (session.user.role === "admin") return session;
     if (session.user.role === "editor" && session.user.id === resourceOwnerId) return session;
     throw new AuthError(403, "Forbidden: you do not own this resource");
   }
   ```

3. **Add role type** (optional but helpful)
   ```typescript
   export type AppRole = "admin" | "editor" | "viewer";
   ```

## Todo List
- [x] Add `AppRole` type
- [x] Add `requireEditorOrAdmin()` function
- [x] Add `requireOwnerOrAdmin()` function
- [x] Verify file stays under 200 lines

## Success Criteria
- Guards compile without errors
- `requireEditorOrAdmin()` allows admin and editor, rejects viewer
- `requireOwnerOrAdmin()` allows admin always, editor only if owner, rejects viewer
- Existing `requireSession()` and `requireAdmin()` unchanged

## Risk Assessment
- Low risk: additive changes only, no existing behavior modified
