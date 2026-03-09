# Codebase Summary

## Project Overview

Financial reporting and invoice tracking application built with Next.js, TypeScript, Prisma ORM, and SQLite.

**Key Features:**
- Authentication & RBAC (Better Auth v1.5.4, admin/editor/viewer roles)
- User management (admin plugin, self-service profile, admin user updates)
- Report data mapping and field template management (ownership-based access control)
- Customer loan and disbursement tracking
- Invoice management with deadline monitoring
- Real-time notifications (in-app + browser push)
- Hourly scheduler for deadline checks
- Multi-language support (Vietnamese/English)
- Document processing with DOCX/XLSX support
- OnlyOffice integration for document editing

## Directory Structure

```
src/
├── app/
│   ├── api/                          # Next.js API routes
│   │   ├── auth/                     # Better Auth endpoints ([...all]/route.ts)
│   │   ├── customers/                # Customer CRUD endpoints
│   │   ├── loans/                    # Loan CRUD + disbursement list
│   │   ├── disbursements/            # Disbursement CRUD + invoices list
│   │   ├── invoices/                 # Invoice CRUD + summary + duplicate check
│   │   ├── notifications/            # Notification list + read endpoints
│   │   ├── user/                     # User endpoints (profile, admin-manage)
│   │   ├── report/                   # Report operations (build, export, import, mapping, templates, etc.)
│   │   ├── onlyoffice/               # OnlyOffice integration (config, callback, download)
│   │   └── cron/                     # Cron endpoints (secret-based auth)
│   │
│   ├── login/                        # Login page (email/password form)
│   │   └── page.tsx                  # Login form with i18n, callbackUrl support
│   │
│   ├── report/                       # Report UI pages (protected by middleware)
│   │   ├── account/                  # User profile page (name, email, password)
│   │   ├── admin/                    # Admin pages
│   │   │   └── users/                # User management (admin only)
│   │   ├── customers/                # Customer list/new/detail pages
│   │   ├── loans/                    # Loan list/new/detail pages
│   │   ├── disbursements/            # Disbursement detail page
│   │   ├── invoices/                 # Invoice overview page
│   │   ├── mapping/                  # Field mapping editor (visual + JSON)
│   │   ├── template/                 # Template management
│   │   ├── runs/                     # Report generation runs
│   │   └── system-operations/        # System operations page
│   │
│   ├── layout.tsx                    # Root layout (scheduler startup)
│   ├── page.tsx                      # Home page
│   └── globals.css                   # Global styles
│
├── components/
│   ├── invoice-tracking/             # Shared invoice tracking components
│   │   ├── loan-status-badge.tsx
│   │   ├── invoice-status-badge.tsx
│   │   ├── surplus-deficit-banner.tsx
│   │   ├── invoice-table.tsx
│   │   ├── invoice-form-modal.tsx
│   │   ├── disbursement-form-modal.tsx
│   │   ├── notification-panel.tsx
│   │   └── notification-bell.tsx     # Sidebar notification icon with polling
│   │
│   ├── ui/                           # Base UI components (modal, controls, etc.)
│   ├── language-provider.tsx         # i18n context provider
│   ├── language-toggle.tsx           # Language switcher component
│   ├── onlyoffice-editor-modal.tsx   # Document editing modal
│   ├── docx-preview-modal.tsx        # Document preview
│   └── ...                           # Report-specific components
│
├── core/
│   ├── errors/
│   │   ├── app-error.ts              # Custom error classes (ValidationError, NotFoundError)
│   │   └── __tests__/                # Error class tests
│   │
│   └── use-cases/
│       ├── extract-fields-from-report.ts
│       ├── extract-fields-from-docx-report.ts    # Main DOCX extraction orchestrator
│       ├── extract-fields-from-ocr.ts            # OCR extraction with shared helpers
│       ├── formula-processor.ts                  # Formula evaluation engine
│       ├── apply-ai-suggestion.ts
│       ├── grouping-engine.ts
│       ├── extraction/                           # Modularized extraction helpers (v2)
│       │   ├── extraction-text-helpers.ts        # Shared text utils (normalize, tokenize, scoring)
│       │   ├── extraction-docx-xml-parser.ts     # DOCX XML table parsing
│       │   ├── extraction-docx-table-fields.ts   # Scalar field extraction from tables
│       │   ├── extraction-docx-paragraph.ts      # Adjacent paragraph extraction
│       │   ├── extraction-docx-repeater.ts       # Repeater/multi-row extraction
│       │   ├── extraction-value-validator.ts     # Zod-based field value validation
│       │   └── (types: FieldSuggestion, ValidationResult)
│       └── __tests__/                            # Use case tests
│
├── services/
│   ├── loan.service.ts               # Loan CRUD service
│   ├── disbursement.service.ts       # Disbursement CRUD service
│   ├── invoice.service.ts            # Invoice CRUD + summary + duplicate detection
│   ├── notification.service.ts       # Notification CRUD + read status
│   │
│   ├── report/
│   │   ├── build.service.ts          # Report compilation with formula evaluation
│   │   ├── template.service.ts       # Template CRUD
│   │   ├── mapping.service.ts        # Field mapping operations
│   │   ├── mapping-instance.service.ts
│   │   ├── master-template.service.ts
│   │   ├── field-values.service.ts
│   │   ├── snapshot.service.ts       # Auto-save snapshots for mapping
│   │   ├── data-io.service.ts        # Import/export data
│   │   ├── _shared.ts                # Shared utilities
│   │   └── _migration-internals.ts   # Data migration helpers
│   │
│   ├── ai-mapping.service.ts         # AI field mapping suggestions
│   ├── auto-tagging.service.ts       # Auto-tagging service
│   ├── document-extraction.service.ts # Document content extraction
│   └── financial-analysis.service.ts  # Financial ratio analysis
│
├── lib/
│   ├── auth.ts                       # Better Auth server config (Prisma adapter)
│   ├── auth-client.ts                # Better Auth client config
│   ├── auth-guard.ts                 # API guards (requireSession, requireAdmin, requireEditorOrAdmin, requireOwnerOrAdmin)
│   │
│   ├── notifications/
│   │   └── deadline-scheduler.ts     # Hourly invoice deadline checker
│   │
│   ├── report/
│   │   ├── field-calc.ts             # Field calculation logic
│   │   ├── field-formulas.ts         # Formula definitions
│   │   ├── field-labels.ts           # Field display names
│   │   ├── financial-field-catalog.ts # Financial fields metadata
│   │   ├── path-validation.ts        # Path/placeholder validation
│   │   ├── template-parser.ts        # DOCX template parsing
│   │   ├── placeholder-utils.ts      # Placeholder replacement
│   │   ├── manual-values.ts          # Manual field overrides
│   │   ├── fs-store.ts               # File system storage
│   │   ├── pipeline-client.ts        # Python pipeline integration
│   │   ├── constants.ts              # Report constants
│   │   ├── upload-limits.ts          # File size limits
│   │   └── use-modal-store.ts        # Modal state management
│   │
│   ├── import/
│   │   ├── bk-importer.ts            # BK file importer
│   │   ├── bk-types.ts               # BK format types
│   │   ├── bk-mapping.ts             # BK field mappings
│   │   └── bk-normalizer.ts          # BK data normalization
│   │
│   ├── onlyoffice/
│   │   └── config.ts                 # OnlyOffice integration config
│   │
│   ├── i18n/
│   │   └── translations.ts           # Translation strings (vi/en)
│   │
│   ├── db.ts                         # Database initialization (deprecated, use prisma directly)
│   ├── prisma.ts                     # Prisma client singleton
│   ├── docx-engine.ts                # DOCX manipulation (python-docx wrapper)
│   ├── xlsx-table-injector.ts        # XLSX table operations
│   ├── bctc-extractor.ts             # BCTC report extraction
│   ├── api-helpers.ts                # API utility functions
│   ├── rate-limiter.ts               # Request rate limiting
│   └── ...                           # Other utilities
│
├── prisma/
│   └── schema.prisma                 # Database schema (SQLite)
│
└── public/
    └── ...                           # Static assets

docs/
├── system-architecture.md            # System design and data models
├── codebase-summary.md               # This file
├── project-changelog.md              # Feature and fix changelog
├── development-roadmap.md            # Project phases and progress
└── ...                               # Other documentation

plans/
└── {date}-{name}/                    # Implementation plans and research reports
    ├── plan.md
    ├── phase-XX-*.md
    ├── reports/
    └── visuals/
```

## Services Overview

### Loan Service (`src/services/loan.service.ts`)
- `list(customerId?)` - Get loans for customer
- `getById(id)` - Get loan with disbursements
- `create(input)` - Create new loan
- `update(id, input)` - Update loan fields or status
- `delete(id)` - Delete loan (cascades to disbursements)

### Disbursement Service (`src/services/disbursement.service.ts`)
- `list(loanId?)` - Get disbursements
- `getById(id)` - Get disbursement with invoices
- `create(input)` - Create disbursement for loan
- `update(id, input)` - Update disbursement
- `delete(id)` - Delete disbursement (cascades to invoices)

### Invoice Service (`src/services/invoice.service.ts`)
- `listByDisbursement(id)` - Invoices for disbursement
- `listAll(filters)` - All invoices (filter by status, customerId)
- `getSummary()` - Totals by status (pending, paid, overdue)
- `getById(id)` - Get invoice details
- `create(input)` - Create invoice
- `update(id, input)` - Update invoice
- `delete(id)` - Delete invoice
- `checkDuplicates(input)` - Find similar invoices by number/supplier

### Notification Service (`src/services/notification.service.ts`)
- `list(opts)` - Unread notifications (max 50)
- `getUnreadCount()` - Count unread
- `create(input)` - Create notification
- `markRead(id)` - Mark single as read
- `markAllRead()` - Mark all as read

### Report Services (`src/services/report/`)
- **build.service.ts** - Compile reports with formula evaluation
- **template.service.ts** - DOCX template CRUD
- **mapping.service.ts** - Field mapping (JSON structure)
- **snapshot.service.ts** - Auto-saved mapping versions
- **data-io.service.ts** - Import/export to/from JSON
- **field-values.service.ts** - Store/retrieve field values
- **master-template.service.ts** - Master template inheritance

### Document Extraction Service (`src/services/document-extraction.service.ts`)
- **Purpose:** Full-document comprehension using Structured AI (OpenAI + Gemini)
- **Features:**
  - Extracts field values from DOCX/OCR documents using AI analysis
  - Supports OpenAI `json_schema` response format (structured outputs)
  - Supports Gemini `responseSchema` for guaranteed JSON structure
  - Batches large field sets into multiple API calls (max 80 fields/call)
  - Document truncation: Head 30K + Tail 10K characters for efficiency
- **Main Methods:**
  - `extractFromDocx(docxFilePath, fields, apiProvider)` - Extract from DOCX files
  - `extractFromOCR(ocrText, fields, apiProvider)` - Extract from OCR text
- **Related Extraction Pipeline:**
  - `src/core/use-cases/extract-fields-from-docx-report.ts` - DOCX orchestrator
  - `src/core/use-cases/extract-fields-from-ocr.ts` - OCR orchestrator
  - `src/core/use-cases/extraction/` - Modularized helpers (text, validation, parsing, extraction)

### AI Mapping Service (`src/services/ai-mapping.service.ts`)
- AI-powered field mapping suggestions for template columns → field placeholders

## Key Classes & Types

### Error Classes (`src/core/errors/app-error.ts`)
```typescript
AppError(message, status, details)
ValidationError(message, details)
NotFoundError(message)
toHttpError(error, fallback) // Convert to HTTP response
```

### Zod Schemas (Input Validation)
- Loan: customerId, contractNumber, loanAmount, startDate, endDate
- Disbursement: loanId, amount, disbursementDate
- Invoice: disbursementId, invoiceNumber, supplierName, amount, dueDate
- Notification: type, title, message, metadata

### Extraction Pipeline Types
**From `src/core/use-cases/extraction/extraction-text-helpers.ts`:**
- `ExtractionSource` - "ocr_ai" | "docx_ai"
- `FieldSuggestion` - { fieldKey, proposedValue, confidenceScore, source, validationStatus? }

**From `src/core/use-cases/extraction/extraction-value-validator.ts`:**
- `ValidationResult` - { valid, status ("valid"|"warning"|"invalid"), normalizedValue? }

**From `src/services/document-extraction.service.ts`:**
- `DocumentFieldExtraction` - { fieldKey, value }

### Database Models (Prisma)
```
Customer → Loan → Disbursement → Invoice
         → MappingInstance ← FieldTemplateMaster

FieldTemplateMaster (createdBy: userId)
MappingInstance (createdBy: userId)

User → Session, Account (auth)
AppNotification (independent)
```

## Important Files

### Entry Points
- `src/app/layout.tsx` - Calls `startDeadlineScheduler()` on app init
- `src/app/page.tsx` - Home/dashboard
- `src/app/report/layout.tsx` - Report section layout

### Deadline Scheduler
- `src/lib/notifications/deadline-scheduler.ts` - Hourly checks (7-day window, deduplication)

### UI Stores (Zustand)
- `use-mapping-data-store.ts` - Mapping editor state
- `use-customer-store.ts` - Customer selection
- `use-field-template-store.ts` - Field template cache
- `use-ui-store.ts` - Modal/panel visibility
- `use-ocr-store.ts` - OCR results cache
- `use-undo-store.ts` - Undo/redo for mapping

### Mapping Editor
- `src/app/report/mapping/page.tsx` - Main editor page
- `src/app/report/mapping/components/FieldCatalogBoard.tsx`
- `src/app/report/mapping/components/MappingVisualSection.tsx`
- `src/app/report/mapping/hooks/useAutoSaveSnapshot.ts`

## API Response Format

**Success Response:**
```json
{ "ok": true, "data": {...} }
```

**Error Response:**
```json
{ "ok": false, "error": "message", "details": {...} }
```

**HTTP Status Codes:**
- 200: Success
- 400: Validation error
- 404: Not found
- 500: Server error

## Testing

**Test Files Location:** `**/__tests__/*.test.ts`

**Key Test Suites:**
- `src/core/errors/__tests__/app-error.test.ts` - Error handling
- `src/core/use-cases/__tests__/formula-processor.test.ts` - Formula evaluation
- `src/core/use-cases/__tests__/apply-ai-suggestion.test.ts` - AI suggestions
- `src/app/report/mapping/__tests__/helpers.test.ts` - Mapping utilities
- `src/lib/report/__tests__/field-calc.test.ts` - Field calculations
- `src/lib/report/__tests__/path-validation.test.ts` - Path validation

**Run Tests:** `npm test`

## Authentication Configuration

**Files:**
- `src/lib/auth.ts` - Server: Better Auth + Prisma adapter + admin plugin
- `src/lib/auth-client.ts` - Client: Sign-in/sign-out functions
- `src/lib/auth-guard.ts` - API guards for route protection
- `middleware.ts` - Session cookie validation for protected routes
- `prisma/schema.prisma` - User, Session, Account, Verification models

**Environment Variables:**
- `BETTER_AUTH_SECRET` - Session signing key (random 32+ bytes)
- `DATABASE_URL` - SQLite path (included in schema)

**Roles:**
- `admin` - Full access + user management (read/create/delete/update), can modify any template/mapping
- `editor` - Can create and modify own templates/mappings, read-access to reports
- `viewer` - Read-only access to reports

**Auth Guard Functions** (`src/lib/auth-guard.ts`):
- `requireSession()` - Validates session exists, throws 401 if missing
- `requireAdmin()` - Validates admin role, throws 403 if not admin
- `requireEditorOrAdmin()` - Validates editor or admin role, throws 403 if viewer
- `requireOwnerOrAdmin(resourceOwnerId)` - Admin bypass or editor must own resource, throws 403 otherwise
- `handleAuthError(error)` - Converts AuthError to NextResponse

## Environment Variables

Key env variables (see `.env.example`):
- `DATABASE_URL` - SQLite database path
- `BETTER_AUTH_SECRET` - Session signing key for Better Auth
- `NEXT_PUBLIC_API_URL` - Frontend API base URL
- `PYTHON_EXECUTABLE` - Python path for document processing
- `ONLYOFFICE_API_URL` - OnlyOffice DS API endpoint
- `ONLYOFFICE_JWT_SECRET` - OnlyOffice JWT signing key
- `CRON_SECRET` - Secret for `/api/cron/**` endpoints (optional, defaults to generated)

## Build & Deployment

**Commands:**
```bash
npm install              # Install dependencies
npm run dev             # Development server
npm run build           # Build for production
npm start               # Run production server
npm test                # Run tests
npx prisma migrate dev  # Create/apply migrations
npx prisma studio      # Prisma data browser
```

**Build Output:** `.next/` directory

**Database:** SQLite file (not committed, created on first run)

## Code Quality Standards

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint configured
- **Formatting:** Prettier
- **Validation:** Zod schemas for all API inputs
- **Error Handling:** Custom AppError classes
- **Testing:** Jest configuration with test coverage

## Recent Additions (Invoice Tracking)

**New in This Release:**
1. Four Prisma models: Loan, Disbursement, Invoice, AppNotification
2. Four services for CRUD + business logic
3. 11 API route files with full REST endpoints
4. Hourly deadline scheduler (7-day warnings, overdue marking)
5. Browser push notifications support
6. 5 UI pages (loans list/new/detail, disbursement detail, invoices)
7. 7 shared components under `src/components/invoice-tracking/`
8. NotificationBell with 60s polling interval
9. Full i18n support for all new features

## Known Limitations

- SQLite not suitable for high-concurrency production (consider PostgreSQL)
- Deadline scheduler runs in-process (serverless not recommended)
- No audit logging for financial transactions
- Push notifications require browser permission and Service Worker
- Admin panel minimal (user list/create/delete only, no UI for edit/deactivate yet)
