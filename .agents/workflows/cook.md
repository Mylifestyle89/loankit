---
description: End-to-end feature implementation — scout, plan, code, test, review, finalize
---

# /cook — Smart Feature Implementation Workflow

// turbo-all

End-to-end implementation with automatic workflow detection.

**Principles:** YAGNI, KISS, DRY | Concise reports | Real code only

## Usage
```
/cook <task description or plan path>
```

## Smart Intent Detection

| Input Pattern | Mode | Behavior |
|---------------|------|----------|
| Path to `plan.md` or `phase-*.md` | code | Execute existing plan directly |
| Contains "fast" or "quick" | fast | Skip research, scout→plan→code |
| Default | full | Full workflow with all steps |

## Full Workflow

### Step 1: Read Project Context
- Read `./README.md` for project overview
- Read `./docs/codebase-summary.md` for codebase structure
- Read the `project-conventions` skill for development rules

### Step 2: Scout Codebase
- Identify all relevant files for the task
- Understand existing patterns and code to reuse
- Map file dependencies and relationships
- Output: List of relevant files with descriptions

### Step 3: Plan Implementation
- Create plan in `./plans/YYMMDD-HHMM-descriptive-name/`
- Write `plan.md` (overview, phases, dependencies)
- Write `phase-XX-name.md` for each phase
- Present plan summary to user for confirmation
- **Gate**: Wait for user approval before proceeding

### Step 4: Implement Code
For each phase in the plan:
- Read the phase file for detailed steps
- Implement code changes following the steps
- Follow project conventions (kebab-case, <200 lines, try-catch, etc.)
- After modifying each file, verify it compiles: `npm run build`
- Mark completed steps in the phase file
- **Report**: `✓ Phase [N]: [Status] - [Files changed]`

### Step 5: Run Tests
- Run `npm test`
- If tests fail → debug and fix (use `/debug` workflow)
- Re-run until 100% pass rate
- **DO NOT** mock, fake, or skip failing tests

### Step 6: Code Review
- Review all changed files using `/review` checklist
- Check: architecture, code quality, security, frontend patterns
- Fix any Critical or Important issues found
- Re-run tests after fixes

### Step 7: Finalize
- Update docs in `./docs/` if changes warrant (codebase-summary, architecture, changelog)
- Update plan status in `plan.md` to "Complete"
- Summary report:
  ```
  ## Cook Summary
  - Task: [description]
  - Files changed: [count]
  - Tests: [pass/total]
  - Review score: [1-10]
  - Plan: [path to plan]
  ```
- Ask user if they want to commit changes

## Fast Mode (skip research & planning)
When "fast" or "quick" detected:
1. Scout codebase (quick)
2. Implement directly (no plan files)
3. Run tests
4. Quick review
5. Finalize

## Rules
- Always implement REAL code — never simulate or mock
- DO NOT create new enhanced files — update existing files directly
- Files must stay under 200 lines (modularize if exceeded)
- Run build check after every code change
- All tests must pass before finalizing
- Update docs if significant changes were made
