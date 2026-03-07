# Scout Report: Codebase Overview

## Project Summary

**Name:** cong-cu-tao-bcdxcv (Financial Reporting & Invoice Tracking Tool)
**Stack:** Next.js 16 + React 19 + TypeScript + Prisma + SQLite + Tailwind CSS 4
**Size:** ~262 TypeScript/TSX files
**State Management:** Zustand
**Testing:** Vitest
**Package Manager:** npm

## Architecture Layers

```
Frontend (React/Next.js Pages + Zustand stores)
    → API Routes (Next.js route handlers)
        → Service Layer (business logic)
            → Core (use-cases, extraction, errors)
                → Prisma ORM → SQLite
```

## Key Domain Areas

### 1. Report Mapping System (Primary Feature)
- Visual field mapping editor for financial reports
- DOCX template parsing, placeholder replacement, export
- AI-assisted field extraction (OpenAI/Gemini)
- OCR processing for document digitization
- Field catalog, formulas, auto-tagging, undo/redo
- Master templates + mapping instances (per customer)

### 2. Invoice Tracking System
- Loan → Disbursement → Invoice hierarchy
- Beneficiary management (recipients of disbursement funds)
- Deadline scheduler (hourly, 7-day warning window)
- Notification system (in-app + browser push)
- Surplus/deficit tracking

### 3. Customer Management
- Customer CRUD with data_json for flexible attributes
- Links to both mapping instances and loans

## Database Models (Prisma/SQLite)

| Model | Purpose |
|-------|---------|
| Customer | Enterprise borrower |
| Loan | Loan agreement (→ Customer) |
| Disbursement | Loan tranche (→ Loan) |
| DisbursementBeneficiary | Junction: disbursement ↔ beneficiary |
| Beneficiary | Fund recipient (→ Loan) |
| Invoice | Supplier invoice (→ Disbursement) |
| AppNotification | In-app alerts |
| FieldTemplateMaster | Master field catalogs |
| MappingInstance | Per-customer mapping state |

## Relevant Files by Area

### API Routes (`src/app/api/`)
- `customers/` - Customer CRUD
- `loans/` - Loan CRUD + disbursements + beneficiaries
- `disbursements/` - Disbursement CRUD + invoices
- `invoices/` - Invoice CRUD + summary + duplicates
- `notifications/` - Read/mark-read
- `report/` - Mapping, build, export, templates, AI extraction, OCR, auto-process, snapshots, backups
- `onlyoffice/` - Document editor integration

### Services (`src/services/`)
- `loan.service.ts` - Loan CRUD
- `disbursement.service.ts` - Disbursement CRUD
- `invoice.service.ts` - Invoice CRUD + summary
- `notification.service.ts` - Notifications
- `customer.service.ts` - Customer CRUD
- `beneficiary.service.ts` - Beneficiary CRUD
- `ai-mapping.service.ts` - AI field mapping
- `document-extraction.service.ts` - AI document extraction
- `financial-analysis.service.ts` - Financial ratios
- `auto-tagging.service.ts` - Auto-tag fields
- `auto-process.service.ts` - Batch processing
- `ocr.service.ts` - OCR processing
- `report/` - Build, mapping, template, snapshots, data-io, field-values, master-template

### Core Use Cases (`src/core/use-cases/`)
- `formula-processor.ts` - Formula evaluation engine
- `grouping-engine.ts` - Field grouping
- `mapping-engine.ts` - Mapping logic
- `report-validation.ts` - Report validation
- `universal-auto-process-engine.ts` - Batch auto-processing
- `extraction/` - Modularized extraction helpers (text, DOCX XML, tables, paragraphs, repeaters, validation)

### UI Pages (`src/app/report/`)
- `mapping/` - Field mapping editor (main feature page)
  - `page.tsx` - Entry point
  - `components/` - 40+ components (canvas, sidebar, modals, toolbar)
  - `hooks/` - 12 custom hooks (API, computed, effects, drag-drop, auto-save)
  - `stores/` - 7 Zustand stores (mapping data, customer, UI, OCR, undo, field templates, groups)
  - `types.ts` - Type definitions
  - `helpers.ts` - Utility functions
- `customers/` - Customer list/detail/new
- `loans/` - Loan list/detail/new
- `disbursements/` - Disbursement detail
- `invoices/` - Invoice overview

### Shared Components (`src/components/`)
- `invoice-tracking/` - Invoice/loan/disbursement UI components
- `ui/` - Base UI (modal, segmented control, theme toggle)
- `language-provider.tsx` + `language-toggle.tsx` - i18n
- `onlyoffice-editor-modal.tsx` - Document editor
- `docx-preview-modal.tsx` - DOCX preview

### Libraries (`src/lib/`)
- `report/` - Field calc, formulas, labels, templates, path validation, placeholder utils
- `import/` - BK file import (types, mapping, normalizer)
- `notifications/` - Deadline scheduler
- `i18n/` - Translation strings (vi/en)
- `onlyoffice/` - Editor config
- `prisma.ts` - Prisma singleton
- `docx-engine.ts` - DOCX manipulation
- `xlsx-table-injector.ts` - XLSX operations
- `rate-limiter.ts` - API rate limiting

## Key Dependencies
- `@dnd-kit/*` - Drag and drop (field ordering)
- `docxtemplater` + `pizzip` - DOCX template processing
- `@google/generative-ai` - Gemini AI extraction
- `xlsx` - Excel file processing
- `tesseract.js` - OCR
- `framer-motion` - Animations
- `lucide-react` - Icons
- `zod` - Schema validation
- `zustand` - State management
- `@prisma/client` + `better-sqlite3` - Database

## Test Files
- `src/core/errors/__tests__/app-error.test.ts`
- `src/core/use-cases/__tests__/formula-processor.test.ts`
- `src/core/use-cases/__tests__/apply-ai-suggestion.test.ts`
- `src/core/use-cases/__tests__/grouping-engine.test.ts`
- `src/lib/report/__tests__/field-calc.test.ts`
- `src/lib/report/__tests__/path-validation.test.ts`
- `src/app/report/mapping/__tests__/helpers.test.ts`

## Config Files
- `prisma/schema.prisma` - Database schema (10 migrations)
- `package.json` - Scripts: dev, build, lint, test
- `tsconfig.json` - TypeScript config
- `vitest.config.*` - Test configuration

## Unresolved Questions
- No `.env.example` found in scan (env vars referenced in docs)
- Python pipeline files (`run_pipeline.py`, `report_pipeline/`) mentioned in README but not found in src/ — may be at root level (blocked from scanning)
