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
│                  API Layer (Route Handlers)               │
│    /api/loans, /api/disbursements, /api/invoices,       │
│    /api/notifications, /api/report/*, /api/customers    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                           │
│   loan, disbursement, invoice, notification services    │
│         + report, mapping, financial analysis           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  Core Libraries                          │
│   Prisma ORM, error handling, i18n, utilities            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                    SQLite Database                       │
│    Tables: customers, loans, disbursements, invoices,   │
│    app_notifications, mapping_instances, etc.           │
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

## UI Pages

### Loans Module
- `/report/loans` - Loans list page with filtering
- `/report/loans/new` - Create new loan form
- `/report/loans/[id]` - Loan detail with disbursements

### Disbursements
- `/report/disbursements/[id]` - Disbursement detail with invoices

### Invoices
- `/report/invoices` - Invoices overview with status filtering

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

## Security Considerations

- Input validation at API layer (Zod schemas)
- Error messages don't leak system details
- No sensitive data in logs
- CORS and rate limiting configured where needed
- Notification metadata is JSON-stringified (not exposed to frontend)

## Performance Optimizations

- Service layer caching reduces repeated DB queries
- Scheduler deduplicates notifications to prevent notification spam
- Indexes on foreign keys and status fields for fast filtering
- Select queries include only necessary fields
- Pagination support in notification retrieval (limit 50)

## Deployment

**Environment:** Node.js 18+

**Build:** `npm run build`

**Start:** `npm start` (production) or `npm run dev` (development)

**Database:** SQLite file in local filesystem (configured in `.env`)

**External Services:**
- Optional: Browser push notification service (Firebase Cloud Messaging)
- Optional: Email service for deadline notifications (not yet implemented)
