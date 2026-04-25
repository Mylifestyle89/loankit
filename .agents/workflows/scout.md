---
description: Scout the codebase to find relevant files for a task
---

# /scout — Codebase Scouting Workflow

## Steps

1. **Analyze the task**: Parse the user's prompt to identify:
   - What features/modules are involved
   - What file types to look for (components, services, API routes, hooks, stores)
   - Key search terms and patterns

// turbo
2. **Search broadly**: Use `grep_search` and `find_by_name` to discover relevant files:
   - Search in `src/app/` for pages and API routes
   - Search in `src/components/` for shared components
   - Search in `src/services/` for business logic
   - Search in `src/lib/` for utilities
   - Search in `src/stores/` for state management
   - Search in `src/hooks/` for custom hooks
   - Search in `src/core/` for use cases and errors

// turbo
3. **Read key files**: Skim the most relevant files to understand their purpose and relationships.

4. **Produce a Scout Report** in this format:

```markdown
# Scout Report: [Task Name]

## Relevant Files
- `path/to/file.ts` — Brief description of what it does
- ...

## File Relationships
- File A imports from File B
- File C depends on File D
- ...

## Key Observations
- Important patterns found
- Existing code that can be reused
- Potential conflicts or concerns

## Unresolved Questions
- Any gaps in findings
```

5. **Ask** if the user wants to dive deeper into any specific file or area.
