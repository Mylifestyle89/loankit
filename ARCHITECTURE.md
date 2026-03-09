# Architecture Overview

This project follows a layered architecture for the Report/Mapping domain:

1. `UI` (`src/app/report/*`, `src/components/*`)
   - Rendering, user interactions, modals, forms, table editing.
   - No database or filesystem business logic.

2. `Hooks` (`src/app/report/mapping/hooks/*`)
   - UI orchestration and side-effect coordination.
   - Calls API routes and keeps view state manageable.

3. `Use-Cases` (`src/core/use-cases/*`)
   - Pure business logic and deterministic transformations.
   - No Next.js-specific imports.
   - Examples: mapping-engine, formula-processor, report-validation.

4. `Services` (`src/services/*`)
   - Application services and transaction boundaries.
   - Compose use-cases, persistence, and adapters.
   - Input/output are plain TypeScript interfaces (not Next Request/Response).

5. `Lib/Adapters` (`src/lib/*`)
   - External integrations and technical adapters:
     - `docx-engine.ts`: DOCX generation, backup path management, template I/O.
     - `report/fs-store.ts`: filesystem state store.
     - Prisma client and infrastructure helpers.

## Request Flow

`UI` -> `Hooks` -> `API Route` -> `Service` -> (`Use-Case` + `Lib/Adapters`) -> Response

API routes are thin adapters:
- Parse request
- Call service
- Map errors (`ValidationError`/`SystemError`) to HTTP response

## Core Principles

- Keep business logic out of API routes and UI components.
- Use explicit error types in `src/core/errors/app-error.ts`.
- Use transactions (`prisma.$transaction`) for multi-entity write operations.
- Keep adapters replaceable (DOCX engine can be swapped without changing service contracts).

