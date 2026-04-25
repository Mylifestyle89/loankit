---
description: Review code quality of a file, module, or recent changes
---

# /review — Code Review Workflow

## Steps

1. **Identify the target**: Determine what to review:
   - If the user specified a file/module → review that
   - If no target specified → review any recently modified files (check `git diff --name-only HEAD~1` or currently active document)

// turbo
2. **Read project conventions**: Read the skill `project-conventions` SKILL.md to understand project rules.

3. **Gather context**: Read the target file(s) to understand the code being reviewed.

4. **Run the review checklist** — Evaluate each category:

   ### Architecture & Structure
   - Files under 200 lines? (Consider modularization if over)
   - Kebab-case file naming with descriptive names?
   - Follows existing codebase patterns in `./docs/codebase-summary.md`?
   - Proper separation: services/, lib/, components/, hooks/, stores/?

   ### Code Quality
   - No syntax errors, code compiles?
   - TypeScript strict mode compliance?
   - Proper try-catch error handling?
   - Input validation with Zod schemas for API routes?
   - Custom AppError classes used for errors?

   ### Security
   - Auth guards applied correctly? (requireSession, requireAdmin, requireEditorOrAdmin, requireOwnerOrAdmin)
   - No sensitive data in logs?
   - No hardcoded secrets?

   ### Frontend (if applicable)
   - React best practices (useCallback, useMemo where needed)?
   - Zustand stores for global state?
   - i18n support for user-facing strings?
   - Proper loading/error states?

5. **Produce a report** with:
   - 🔴 **Critical** — Must fix before merge
   - 🟡 **Important** — Should fix soon
   - 🟢 **Suggestion** — Nice to have
   - Overall quality score (1-10)

6. **Offer to fix** any Critical or Important issues found.
