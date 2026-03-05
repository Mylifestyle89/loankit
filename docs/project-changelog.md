# Project Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) conventions.

## [Unreleased]

### Changed - AI Extraction Pipeline Refactor

#### Modularization
- **extraction/** directory: Split 660-line `extract-fields-from-docx-report.ts` into 6 focused modules
  - `extraction-text-helpers.ts` (~160 lines) - Shared utilities (normalize, tokenize, scoring)
  - `extraction-docx-xml-parser.ts` (~140 lines) - DOCX XML table parsing
  - `extraction-docx-table-fields.ts` (~60 lines) - Scalar field extraction
  - `extraction-docx-paragraph.ts` (~75 lines) - Adjacent paragraph extraction
  - `extraction-docx-repeater.ts` (~140 lines) - Repeater/multi-row extraction
  - `extraction-value-validator.ts` (~160 lines) - Zod-based validation for Vietnamese formats

#### Validation Layer
- **extraction-value-validator.ts**: Zod schemas for Vietnamese number/date/percent formats
  - Validates extracted values against declared field types
  - Confidence score adjustment: +0.05 (valid), -0.15 (warning)
  - Supports common Vietnamese formats (DD/MM/YYYY, VN thousand separators)

#### Structured AI Outputs
- **document-extraction.service.ts**: Added OpenAI `json_schema` response format
- **document-extraction.service.ts**: Added Gemini `responseSchema` support
- Ensures guaranteed JSON structure for batch field extractions

#### API Improvements
- `extract-fields-from-ocr.ts`: Updated to use shared extraction helpers and validation
- Consistent `FieldSuggestion` type across DOCX and OCR pipelines

## [Phase 48] - 2026-03-05

### Added - Disbursement Invoice Tracking Feature

#### Database Models
- **Loan** model: Represents loan agreements with customer, contract number, amount, interest rate, date range, and status (active/completed/cancelled)
- **Disbursement** model: Loan tranches with amount, date, and status tracking
- **Invoice** model: Supplier invoices against disbursements with issue/due dates, custom deadline override, and status (pending/paid/overdue)
- **AppNotification** model: In-app notifications for deadline warnings and alerts with JSON metadata

#### Services
- **loan.service.ts**: Full CRUD for loans with customer and disbursement relationships
- **disbursement.service.ts**: Disbursement management with invoice tracking
- **invoice.service.ts**: Invoice CRUD, summary reporting, and duplicate detection
- **notification.service.ts**: Notification management with read status tracking

#### API Routes (11 endpoints)
- `GET/POST /api/loans` - List and create loans
- `GET/PUT/DELETE /api/loans/[id]` - Loan detail operations
- `GET /api/loans/[id]/disbursements` - List disbursements for loan
- `POST /api/disbursements` - Create disbursement
- `GET/PUT/DELETE /api/disbursements/[id]` - Disbursement operations
- `GET /api/disbursements/[id]/invoices` - List invoices for disbursement
- `GET/POST /api/invoices` - List and create invoices
- `GET/PUT/DELETE /api/invoices/[id]` - Invoice operations
- `GET /api/invoices/summary` - Invoice summary statistics
- `POST /api/invoices/check-duplicates` - Duplicate invoice detection
- `GET /api/notifications` - List notifications
- `POST /api/notifications/[id]/read` - Mark notification as read
- `POST /api/notifications/mark-all-read` - Mark all notifications as read

#### Deadline Scheduler
- **deadline-scheduler.ts**: Hourly background task in `src/lib/notifications/`
  - Scans for invoices due within 7 days (considers customDeadline override)
  - Creates "invoice_due_soon" notifications
  - Marks invoices as overdue when past due date
  - Creates "invoice_overdue" notifications
  - Deduplicates notifications (24-hour window to prevent spam)
  - Runs on app initialization and every 60 minutes

#### UI Pages (5 pages)
- `/report/loans` - Loans list with customer filtering and status badges
- `/report/loans/new` - Create new loan form
- `/report/loans/[id]` - Loan detail with disbursements list
- `/report/disbursements/[id]` - Disbursement detail with invoices
- `/report/invoices` - Invoices overview with status filtering and summary

#### Shared Components (7 components)
- `LoanStatusBadge` - Visual status indicator (active/completed/cancelled)
- `InvoiceStatusBadge` - Visual status indicator (pending/paid/overdue)
- `SurplusDeficitBanner` - Disbursement amount vs total invoices comparison
- `InvoiceTable` - Reusable invoice list with sorting and filtering
- `InvoiceFormModal` - Form for creating/editing invoices with validation
- `DisbursementFormModal` - Form for creating disbursements
- `NotificationPanel` - Notification list display with read/clear actions
- `NotificationBell` - Sidebar notification icon with unread count badge, 60-second polling interval

#### Notifications
- Browser push notifications when invoice deadline approaching (requires user permission)
- In-app notifications via AppNotification table
- NotificationBell component in sidebar with real-time unread count
- Notification types: invoice_due_soon, invoice_overdue, duplicate_invoice

#### Internationalization (i18n)
- Full translation support for Vietnamese (vi) and English (en)
- Loan status names, disbursement labels, invoice fields
- Form validation messages and error text
- Notification titles and messages
- All UI text for loan/disbursement/invoice pages

#### Validation & Error Handling
- Zod schemas for all API inputs (loan, disbursement, invoice creation/updates)
- Custom validation errors with field-level details
- NotFoundError for missing resources
- Input trimming and type coercion
- Duplicate invoice detection via `checkDuplicates()` service method

### Changed
- `src/app/layout.tsx` - Added deadline scheduler startup call
- Prisma schema - Added four new models with proper relationships and indexes
- i18n translations - Extended with loan/disbursement/invoice strings

### Technical Details
- Database: SQLite with strategic indexes on customerId, status, dueDate
- Relations: Customer → Loan → Disbursement → Invoice (cascade delete)
- Status fields use string enum pattern for flexibility
- Unique constraint on (invoiceNumber, supplierName) tuple
- JSON metadata field in AppNotification for extensibility

## [Phase 47] - 2026-02-28

### Added - OnlyOffice Integration Phase 2
- Report export with OnlyOffice preview capability
- Path duplication bug fix in document handling
- Enhanced error logging in OnlyOffice callbacks
- Placeholder sidebar for quick field reference
- Editor mode toggle on mapping page
- Promote-to-master functionality for templates
- Auto-save snapshots for mapping editor

### Changed
- OnlyOffice API configuration simplified
- Error handling improved in all OnlyOffice routes

## [Phase 46] - 2026-02-15

### Added - OnlyOffice Integration Phase 1
- OnlyOffice Document Server integration
- Web-based document editor modal
- Document editing callbacks and callbacks handling
- Health check endpoint for OnlyOffice service

### Fixed
- Security audit issues for OnlyOffice integration

## Earlier Phases

### Report Mapping & Field Templates
- Field template master system
- Mapping instance management
- Auto-tagging service
- OCR integration
- AI field suggestions
- Snapshot/restore functionality

### Report Generation
- DOCX template parsing and placeholder replacement
- XLSX table injection
- Report building with formula evaluation
- Import/export functionality
- Financial analysis and ratio calculations

### Customer Management
- Customer CRUD operations
- Customer data JSON storage for reports

### Document Processing
- Python document extraction pipeline
- BCTC (Balance Sheet) extraction
- BK format importer

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v1.5.0 | 2026-03-05 | Disbursement Invoice Tracking MVP |
| v1.4.0 | 2026-02-28 | OnlyOffice Integration Phase 2 |
| v1.3.0 | 2026-02-15 | OnlyOffice Integration Phase 1 |
| v1.2.x | 2026-01-xx | Report mapping features |
| v1.1.x | 2025-12-xx | Initial report generation |
| v1.0.0 | 2025-11-xx | Project bootstrap |

---

## Deprecations

### Scheduled for Removal
- `src/lib/db.ts` - Use Prisma client directly
- In-process scheduler for serverless deployments - Plan migration to job queue service

### Backward Compatibility
- All API responses maintain `{ ok, data/error }` structure
- No breaking changes to existing endpoints
- New models added without modifying existing ones

---

## Security

### Recent Security Updates
- Fixed: OnlyOffice integration security audit findings (Phase 46)
- Input validation strengthened with Zod schemas
- Error messages sanitized to prevent information leakage

### Known Security Considerations
- No role-based access control (single user assumed)
- No audit logging for financial transactions
- SQLite file permissions should be restricted in production
- Push notifications require user browser permission

---

## Performance Notes

### Optimizations Implemented
- Strategic indexes on frequently queried columns
- Service layer deduplicates notifications
- Notification polling interval: 60 seconds
- Deadline scheduler runs hourly
- Pagination support (limit 50) in notification retrieval

### Database Considerations
- SQLite suitable for single/small team deployments
- Not recommended for high-concurrency production (consider PostgreSQL)
- File-based approach works well with file-based deployments

---

## Breaking Changes

### v1.5.0
- None (new feature, purely additive)

### v1.4.0
- OnlyOffice integration changes to API contract (non-breaking)

---

## Future Roadmap Items

- [ ] Role-based access control (admin, user, viewer roles)
- [ ] Audit logging for financial transactions
- [ ] Email notifications for invoice deadlines
- [ ] Batch invoice import/export
- [ ] Invoice payment tracking
- [ ] Financial dashboards and analytics
- [ ] Multi-organization support
- [ ] PostgreSQL migration guide
- [ ] Job queue for background tasks (deadline scheduler, PDF generation)
- [ ] Mobile app
