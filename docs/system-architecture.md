# System Architecture

## Overview

This is a Next.js-based financial reporting and invoice tracking application built with TypeScript, Prisma ORM, and SQLite database.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  (React Components, Pages, Hooks, State Management)      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  Middleware (Auth Gate)                  │
│  Session cookie check: Fast path (5-min cache)          │
│  Routes: /login (public), /report/** (protected),       │
│  /api/** (protected), /api/cron/** (secret-based)       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  API Layer (Route Handlers)               │
│    /api/auth/** (better-auth), /api/loans,              │
│    /api/disbursements, /api/invoices,                   │
│    /api/notifications, /api/report/*, /api/customers    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                           │
│   loan, disbursement, invoice, notification services    │
│         + report, mapping, financial analysis           │
│   Auth guards: requireSession(), requireAdmin()         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  Core Libraries                          │
│   Prisma ORM, error handling, i18n, utilities            │
│   Better Auth (v1.5.4 with Prisma adapter)              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                    SQLite Database                       │
│    Tables: customers, loans, disbursements, invoices,   │
│    app_notifications, mapping_instances,                │
│    user, session, account (auth), role (RBAC)           │
└─────────────────────────────────────────────────────────┘
```

## Core Models

### Customer
- **Purpose:** Represents an enterprise borrower
- **Fields:** ID, code, name, address, business type, charter capital, legal representative
- **Relations:** Has many Loans

### Loan
- **Purpose:** Represents a loan agreement between bank and customer
- **Fields:** ID, contractNumber (unique), loanAmount, interestRate, startDate, endDate, purpose, status
- **Status Values:** active | completed | cancelled
- **Relations:** Belongs to Customer, has many Disbursements

### Disbursement
- **Purpose:** Tranche of a loan released to customer
- **Fields:** ID, amount, disbursementDate, description, status
- **Status Values:** active | completed | cancelled
- **Relations:** Belongs to Loan, has many Invoices

### Invoice
- **Purpose:** Supplier invoice against a disbursement (proof of fund usage)
- **Fields:** ID, invoiceNumber, supplierName, amount, issueDate, dueDate, customDeadline, status, notes
- **Status Values:** pending | paid | overdue
- **Unique Constraint:** (invoiceNumber, supplierName) pair
- **Relations:** Belongs to Disbursement
- **Indexes:** disbursementId, status, dueDate (for deadline queries)

### AppNotification
- **Purpose:** In-app notification for deadline warnings and alerts
- **Fields:** ID, createdAt, readAt, type, title, message, metadata (JSON)
- **Type Values:** invoice_due_soon | invoice_overdue | duplicate_invoice
- **Metadata:** Contains invoiceId, disbursementId, customerId (as JSON)

### FieldTemplateMaster
- **Purpose:** Master template for field configurations (templates created by users)
- **Fields:** ID, name, description, status, fieldCatalogJson, createdBy (userId)
- **Ownership:** `createdBy` tracks the user who created the template
- **Access Control:** Editors can only modify templates they created; admins can modify all templates

### MappingInstance
- **Purpose:** Customer-specific field mapping instance
- **Fields:** ID, name, status, createdBy (userId), publishedAt, masterId (FK), customerId (FK)
- **Status Values:** draft | published
- **Ownership:** `createdBy` tracks the user who created the mapping

### Collateral (KHCN)
- **Purpose:** Loan collateral (movable, savings, land, other assets)
- **Fields:** ID, customerId (FK), loanPlanId (FK), type, owner_info, asset_details (JSON)
- **Types:** dong_san (vehicles), tien_gui (savings), dat (land), khac (other)
- **Relations:** Belongs to Customer and LoanPlan
- **Asset Details:** Manufacture year, seat count, mortgage holder, certificate dates, etc.

### CoBorrower (KHCN)
- **Purpose:** Co-borrower relationships for joint loans
- **Fields:** ID, customerId (FK), loanPlanId (FK), relationship, name, id_number
- **Relations:** Belongs to Customer and LoanPlan

### CreditInfo (KHCN)
- **Purpose:** Customer credit history and agribank/other credit records
- **Fields:** ID, customerId (FK), type (agribank|other), credit_data (JSON)
- **Relations:** Belongs to Customer

## Deadline Scheduler

**Location:** `src/lib/notifications/deadline-scheduler.ts`

**Functionality:**
- Runs hourly check on invoice deadlines
- Identifies invoices due within 7 days (pending status)
- Creates "invoice_due_soon" notifications with deduplication (24h window)
- Marks overdue invoices (status: "overdue") when current date exceeds dueDate/customDeadline
- Auto-creates "invoice_overdue" notifications
- Prevents duplicate notifications within 24 hours for same invoice

**Startup:** Called in `src/app/layout.tsx` via `startDeadlineScheduler()`

## API Routes

### Loans
- `GET /api/loans` - List loans (filter by customerId)
- `POST /api/loans` - Create loan
- `GET /api/loans/[id]` - Get loan with disbursements
- `PUT /api/loans/[id]` - Update loan
- `DELETE /api/loans/[id]` - Delete loan
- `GET /api/loans/[id]/disbursements` - List disbursements for loan

### Disbursements
- `GET /api/disbursements/[id]` - Get disbursement with invoices
- `POST /api/disbursements/[id]` - Create disbursement for loan
- `PUT /api/disbursements/[id]` - Update disbursement
- `DELETE /api/disbursements/[id]` - Delete disbursement
- `GET /api/disbursements/[id]/invoices` - List invoices for disbursement

### Invoices
- `GET /api/invoices` - List all invoices (filter by status, customerId)
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/[id]` - Get invoice details
- `PUT /api/invoices/[id]` - Update invoice
- `DELETE /api/invoices/[id]` - Delete invoice
- `GET /api/invoices/summary` - Get invoice summary (totals by status)
- `POST /api/invoices/check-duplicates` - Detect duplicate invoices

### Notifications
- `GET /api/notifications` - List notifications (unread only, limit 50)
- `POST /api/notifications/[id]/read` - Mark single notification as read
- `POST /api/notifications/mark-all-read` - Mark all as read

### Templates & Mappings
- `GET /api/report/field-templates` - List templates (requireSession)
- `POST /api/report/field-templates` - Create template (requireEditorOrAdmin)
- `PUT /api/report/field-templates/[id]` - Update template (requireOwnerOrAdmin)
- `DELETE /api/report/field-templates/[id]` - Delete template (requireOwnerOrAdmin)
- `GET /api/report/mapping-instances` - List mapping instances (requireSession)
- `POST /api/report/mapping-instances` - Create mapping (requireEditorOrAdmin)
- `PUT /api/report/mapping-instances/[id]` - Update mapping (requireOwnerOrAdmin)
- `DELETE /api/report/mapping-instances/[id]` - Delete mapping (requireOwnerOrAdmin)
- `GET /api/report/master-templates` - List master templates (requireSession)
- `POST /api/report/master-templates` - Create master (requireEditorOrAdmin)
- `PUT /api/report/master-templates/[id]` - Update master (requireOwnerOrAdmin)
- `DELETE /api/report/master-templates/[id]` - Delete master (requireOwnerOrAdmin)

### User Management
- `GET /api/user/profile` - Get current user profile
- `PUT /api/user/profile` - Update own name/email/password
- `PUT /api/user/admin-manage` - Admin-only: update any user email/password (requireAdmin)

## UI Pages

### Loans Module
- `/report/loans` - Loans list page with filtering
- `/report/loans/new` - Create new loan form
- `/report/loans/[id]` - Loan detail with disbursements

### Disbursements
- `/report/disbursements/[id]` - Disbursement detail with invoices

### Invoices
- `/report/invoices` - Invoices overview with status filtering

### User Account
- `/report/account` - User profile (name, email, password change)

## Shared Components

**Location:** `src/components/invoice-tracking/`

- `LoanStatusBadge` - Visual status indicator for loans
- `InvoiceStatusBadge` - Visual status indicator for invoices
- `SurplusDeficitBanner` - Shows disbursement surplus/deficit
- `InvoiceTable` - Reusable invoice list with sorting/filtering
- `InvoiceFormModal` - Form for creating/editing invoices
- `DisbursementFormModal` - Form for creating/editing disbursements
- `NotificationPanel` - Displays notification list with read/clear actions
- `NotificationBell` - Sidebar icon with unread badge, polls every 60s

## Cross-Tab Customer Data Hub

**Purpose:** Centralized customer state management for synchronized filtering and context across all report tabs.

**Components:**

1. **Zustand Store** (`src/stores/use-customer-store.ts`)
   - Global customer list and selected customer ID state
   - Persists selected customer ID to localStorage (SSR-safe hydration)
   - Exports: `useCustomerStore()`, `useSelectedCustomer()`, `useIsCustomerStoreHydrated()`

2. **Shared Hook** (`src/hooks/use-customer-data.ts`)
   - `useCustomerData()` - Single entry point for fetching and caching customers
   - Called once in layout (`src/app/report/layout.tsx`) to populate store globally
   - Prevents redundant API calls across tabs
   - Returns: `{ customers, loading }`

3. **Context Indicator Widget** (`src/components/customer-context-indicator.tsx`)
   - Sidebar widget displaying selected customer name and code
   - Clear button to reset selection
   - Responsive: collapsed icon view vs expanded text view
   - Uses Zustand selectors to avoid unnecessary re-renders

**Data Flow:**
1. Layout calls `useCustomerData()` on mount → fetches `/api/customers` once
2. Customers list stored in Zustand, persisted to localStorage
3. Selecting customer in Customers tab updates store via `setSelectedCustomerId()`
4. Store subscription triggers re-renders in:
   - Loans tab (auto-filters by selectedCustomerId)
   - Invoices tab (auto-filters by selectedCustomerId)
   - CustomerContextIndicator (displays selected customer)

**Hydration Safety:**
- `_hasHydrated` flag prevents SSR mismatch (localStorage not available on server)
- `useSelectedCustomer()` returns null until hydrated
- Components check `useIsCustomerStoreHydrated()` before rendering dependent UI

## Notification System

**Push Notifications:**
- Desktop browser push notifications when invoice deadline approaching
- Uses Service Worker and Push API
- User approval required (browser permission)

**In-App Notifications:**
- Stored in AppNotification table
- Retrieved via `/api/notifications` endpoint
- NotificationBell component polls at 60s interval
- Includes marking as read functionality

**Notification Types:**
1. `invoice_due_soon` - Triggered 7 days before due date
2. `invoice_overdue` - Triggered when invoice passes due date
3. `duplicate_invoice` - Triggered when duplicate detected via API

## Internationalization (i18n)

**Supported Languages:** Vietnamese (vi), English (en)

**Implementation:**
- Centralized translation strings in `src/lib/i18n/translations.ts`
- Language context provider for React components
- Language toggle in sidebar
- Persistent language preference

**Coverage:** Loan/disbursement/invoice labels, status names, form validation messages, notifications

## Error Handling

**Custom Error Classes:**
- `AppError` - Base class
- `ValidationError` - Input validation failures (400)
- `NotFoundError` - Resource not found (404)
- `toHttpError()` - Converts errors to HTTP responses

**Error Handling Pattern:**
- Try-catch in API routes with error conversion
- Client-side error boundaries on pages
- User-friendly error messages with i18n support

## Database

**Provider:** SQLite

**Schema:** Defined in `prisma/schema.prisma`

**Key Features:**
- Relational constraints with cascade delete
- Strategic indexes on frequently queried fields (customerId, status, dueDate)
- JSON fields for flexible metadata storage

**Migrations:** Run via `npx prisma migrate dev`

## Document Extraction Pipeline

**Purpose:** Automated field value extraction from financial documents (DOCX/OCR) using structured AI.

### Architecture Overview
```
┌──────────────────────────────────────────┐
│  Document (DOCX/OCR Text)                │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  AI Extraction Service                   │
│  - Batch field requests (max 80/call)    │
│  - Structured outputs (OpenAI/Gemini)    │
│  - Document truncation (30K+10K chars)   │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Extraction Pipeline (Modularized)       │
│  ├─ Text Helpers (normalize, tokenize)   │
│  ├─ DOCX XML Parser (table extraction)   │
│  ├─ Value Validator (Zod-based)          │
│  ├─ Field Extractors (table/paragraph)   │
│  └─ Repeater Engine (multi-row data)     │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Validated Field Suggestions             │
│  - Field key, value, confidence score    │
│  - Validation status (valid/warning)     │
│  - Confidence adjustment (+0.05/-0.15)   │
└──────────────────────────────────────────┘
```

### Key Components

**Document Extraction Service** (`src/services/document-extraction.service.ts`)
- Manages API calls to OpenAI (gpt-4o-mini) and Gemini (1.5-flash)
- Implements `json_schema` (OpenAI) and `responseSchema` (Gemini) for structured outputs
- Supports batching: up to 80 fields per call, auto-splits large requests
- Truncates documents intelligently: first 30K + last 10K characters
- Timeout: 28 seconds per API call (40K input text ~10-25s)

**Extraction Modules** (`src/core/use-cases/extraction/`)
1. **extraction-text-helpers.ts** (~160 lines)
   - `normalizeText()` - Vietnamese diacritics handling
   - `tokenize()` - Text splitting for overlap scoring
   - `scoreTokenOverlap()` - Fuzzy matching (0-1)
   - Shared `FieldSuggestion` type

2. **extraction-value-validator.ts** (~160 lines)
   - Zod schemas for Vietnamese date/number formats
   - Validates: number, date, percent, boolean, text
   - `ValidationResult`: valid/warning/invalid status
   - Confidence score adjustments: +0.05 (valid), -0.15 (warning)

3. **extraction-docx-xml-parser.ts** (~140 lines)
   - Parses DOCX XML structure
   - Extracts table cells, rows, paragraphs
   - Handles XML namespaces and complex formatting

4. **extraction-docx-table-fields.ts** (~60 lines)
   - Scalar field extraction from DOCX tables
   - Matches headers → values by token overlap
   - Returns single values per field

5. **extraction-docx-paragraph.ts** (~75 lines)
   - Extracts values from adjacent paragraphs
   - Finds label patterns near target fields

6. **extraction-docx-repeater.ts** (~140 lines)
   - Multi-row/repeater extraction
   - Detects table patterns for line-item data
   - Returns arrays of extracted rows

**Orchestrators**
- `extract-fields-from-docx-report.ts` - DOCX pipeline (uses extraction modules + validation)
- `extract-fields-from-ocr.ts` - OCR pipeline (uses shared helpers + validation)

### Data Flow
1. User uploads DOCX/provides OCR text
2. Service batches fields into requests (max 80/batch)
3. AI extracts values with structured JSON response
4. Extraction modules parse and normalize values
5. Validator checks against expected types (Vietnamese formats)
6. Confidence score adjusted based on validation status
7. Field suggestions returned to UI for user review

### Performance Optimizations
- Document truncation reduces input tokens (~40K chars = ~10K tokens)
- Batching reduces API calls (80 fields in 1 call vs 80 calls)
- Shared text helpers avoid duplication across DOCX/OCR pipelines
- Validation via Zod (fast, compiled schemas)
- Timeout management prevents hanging requests

## Authentication & Authorization

**System:** Better Auth v1.5.4 with Prisma adapter

**Components:**
- `src/lib/auth.ts` - Server config (email/password, admin plugin, cookie caching)
- `src/lib/auth-client.ts` - Client config for sign-in/sign-out
- `src/lib/auth-guard.ts` - API guards:
  - `requireSession()` - Validate session, throw 401 if missing
  - `requireAdmin()` - Validate admin role, throw 403 if not admin
  - `requireEditorOrAdmin()` - Validate editor or admin role, throw 403 if viewer
  - `requireOwnerOrAdmin(resourceOwnerId)` - Admin bypass or editor matches resource owner, throw 403 otherwise
- `middleware.ts` - Route protection (session cookie check, 5-min cache)
- `src/app/login/page.tsx` - Login UI (email/password form with i18n)

**Auth Features:**
- Email/password authentication (invite-only, public signup disabled)
- Three roles: `admin` (full access + user management), `editor` (own resources + templates), `viewer` (read-only)
- Admin plugin: User CRUD operations (`/report/admin/users`)
- Session cookie caching: 5-min TTL to reduce DB calls
- Open redirect prevention: Validated callbackUrl on login redirect
- Self-service profile: Users can update own name, email, password at `/report/account`
- Admin user management: Admins can update any user via `/api/user/admin-manage`

**Protected Routes:**
- `/report/**` - Require session (page-level redirect to /login)
- `/api/**` - Require session (return 401 if missing)
- `/api/cron/**` - Secret-based auth (x-cron-secret header)
- `/api/onlyoffice/callback` - JWT-based auth (server-to-server)

**Public Routes:**
- `/` - Home page
- `/login` - Login form (redirects authenticated users to /report/mapping)
- `/api/auth/**` - Better Auth endpoints

**Database Models:**
- `User` - Email, name, role, hashed password
- `Session` - User sessions with expiryDate
- `Account` - OAuth provider accounts
- `Role` - Admin/viewer role definitions

**Seed Admin:**
- Email: `admin@company.com`
- Password: `changeme123!`
- Script: `prisma/seed-admin.ts`

## Security Considerations

- Input validation at API layer (Zod schemas)
- Error messages don't leak system details
- Auth guards on sensitive write routes (requireAdmin)
- Middleware prevents unauthenticated access (session cookie check)
- Open redirect prevention on login callback
- No sensitive data in logs
- CORS and rate limiting configured where needed
- Notification metadata is JSON-stringified (not exposed to frontend)
- Cookie caching reduces DB load (5-min TTL)

## KHCN Data Builder Architecture

**Purpose:** Modularized builders for KHCN-specific loan plan data extraction and transformation.

**Main Components:**

1. **khcn-report-data-builders.ts** (~350 LOC)
   - `parseOwners()` - Extract owner info from raw object (name, id_number, relationship)
   - `buildOwnerFields()` - Transform owners array into prefixed fields (CHUDAN_*, CDAI_*)
   - `buildMovableCollateralData()` - Multi-vehicle loop array (DS_CHI_TIET) with field mappings
   - `buildSavingsCollateralData()` - Savings collateral fields (TK.* prefix)
   - `buildOtherCollateralData()` - Generic collateral fields (TSK.* prefix)
   - All builders use consistent field key mapping pattern

2. **khcn-asset-template-registry.ts** (~70 templates)
   - 7 asset categories: tai_san, ts_qsd_bv, ts_qsd_bt3, ts_glvd_bv, ts_glvd_bt3, ts_ptgt_bv, ts_ptgt_bt3
   - ~10 templates per category for different DOCX formats
   - Templates include certificate fields (issue_date, issuing_authority)

3. **khcn-template-registry.ts**
   - Imports and merges base + asset templates
   - Used by khcn-report.service.ts for report generation

4. **DOCX Section Cloner** (`src/lib/docx-engine.ts`)
   - `cloneDocxSections()` utility clones template body N times for N collaterals
   - Rewrites prefixed placeholders to indexed form (e.g., `[SĐ.field]` → `[SĐ_1.field]`, `[SĐ_2.field]`)
   - Handles delimiter detection (`[` and `]`) and prefix scanning (SĐ., ĐS., TK., TSK.)
   - Preserves page settings (`<w:sectPr>`) and maintains XML structure integrity
   - Backward compatible: 1 collateral = no cloning behavior

**Data Flow:**
1. khcn-report.service.ts calls data builders with collateral count
2. Builders extract and transform raw database objects, emit indexed keys
3. Transformed data assigned to field keys (e.g., DS_CHI_TIET[0].HANG_HOA, SĐ_1.field, SĐ_2.field)
4. docx-engine clones template sections before render
5. docxtemplater injects field values into indexed placeholders
6. Final DOCX contains all collaterals rendered sequentially

## XLSX Loan Plan Parser Architecture

**Purpose:** Parse and extract loan plan data from Excel files with multiple format support and smart section detection.

### Parser Types

1. **Type A Parser** - Horizontal table format (cost items in columns)
2. **Type B Parser** - Vertical table format with smart section detection for generic PAKD files
3. **Type S Parser** - Single-row summary format with aggregated values

### Core Components

**Shared Utilities** (`src/lib/import/xlsx-number-utils.ts`)
- `parseNum()` - Handle VND formatting (thousand-sep dots, preserve decimals)
- `parseDecimal()` - Lenient decimal parsing for area, ratios, etc.

**Section Detection** (`src/lib/import/xlsx-section-detector.ts`)
- `splitSections()` - Detect cost/revenue/summary boundaries using Vietnamese markers
- `extractSummaryMeta()` - Extract financial metadata (lãi vay, thuế, vốn tự có, nhu cầu vốn)
- Pattern-based section detection: `SECTION_MARKERS` for cost totals, revenue, profit, interest, tax, loan need, own capital

**Type B Parser** (`src/lib/import/xlsx-loan-plan-parser-type-b.ts`)
- Auto-detect column headers (name, unit, quantity, unit price, amount)
- Smart section detection for generic PAKD files
- Extract: cost items array, revenue items array, financial metadata

**Auto-Detection** (`src/lib/import/xlsx-loan-plan-detector.ts`)
- Analyzes Excel structure (row count, column patterns)
- Routes to appropriate parser (Type A/B/S)
- Fallback: Type B for generic PAKD files

### Data Flow

1. User uploads Excel file
2. Auto-detector examines structure, selects parser type
3. Parser detects header row, identifies column mapping (name, unit, qty, price, amount)
4. Type B: Split sections using Vietnamese section markers
5. Extract items from cost/revenue ranges
6. Extract summary metadata from marker rows
7. Return structured `XlsxParseResult` with cost items, revenue items, metadata

### Type B Use Cases

- Generic PAKD files (thiết bị y tế, mùi nệm, etc.)
- Any vertical-format Excel with cost and revenue sections
- Handles missing optional columns (unit, quantity)
- Flexible column header matching (order-independent)

## Performance Optimizations

- Service layer caching reduces repeated DB queries
- Scheduler deduplicates notifications to prevent notification spam
- Indexes on foreign keys and status fields for fast filtering
- Select queries include only necessary fields
- Pagination support in notification retrieval (limit 50)
- Data builder functions use extracted helpers (parseOwners) for DRY extraction

## Deployment

**Environment:** Node.js 18+

**Build:** `npm run build`

**Start:** `npm start` (production) or `npm run dev` (development)

**Database:** SQLite file in local filesystem (configured in `.env`)

**External Services:**
- Optional: Browser push notification service (Firebase Cloud Messaging)
- Optional: Email service for deadline notifications (not yet implemented)
