---
description: Create a detailed implementation plan for a feature or task
---

# /plan — Implementation Planning Workflow

## Steps

// turbo
1. **Read project context**:
   - Read `./README.md` for project overview
   - Read `./docs/codebase-summary.md` for codebase structure
   - Read `./docs/system-architecture.md` for architecture patterns
   - Read `./docs/development-roadmap.md` for current progress

2. **Analyze the task**:
   - Parse user requirements
   - Identify scope and complexity
   - List affected files and modules

// turbo
3. **Scout the codebase**: Use `/scout` approach to find all relevant existing files.

4. **Create plan directory**:
   - Format: `plans/YYMMDD-HHMM-descriptive-name/`
   - Create `plan.md` as overview
   - Create `phase-XX-name.md` for each implementation phase

5. **Write plan.md** (keep under 80 lines):
   - Overview of the task
   - List of phases with status
   - Key dependencies
   - Estimated effort

6. **Write phase files** — each phase should contain:
   - **Context**: Links to related files and docs
   - **Overview**: Priority, status, description
   - **Requirements**: Functional + non-functional
   - **Related Code Files**: Files to modify/create/delete
   - **Implementation Steps**: Detailed, numbered steps
   - **Todo List**: Checkbox tracking
   - **Success Criteria**: Definition of done
   - **Risk Assessment**: Potential issues + mitigations

7. **Output**: Present the plan summary and ask user to confirm before implementation.

## Rules
- DO NOT implement code — only create plans
- Plans must be self-contained with all necessary context
- Include code snippets/pseudocode when helpful
- Follow YAGNI, KISS, DRY principles
- Be honest about risks and unknowns
