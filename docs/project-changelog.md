# Project Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) conventions.

## [Unreleased]

## [Phase 50] - 2026-03-07

### Added - Field Editor UI Reorganization

#### Toolbar Optimization
- **MappingVisualToolbar** slimmed from 7 to 5 elements
  - Removed: Financial analysis, backup, OCR drop zone, OCR badge
  - Added: Tech keys toggle, sidebar toggle button
  - Maintains: Search, unmapped filter, add field actions

#### Sidebar Restructuring
- **MappingSidebar** refactored from 813 to 137 lines (parent container only)
  - Split into 3 focused sub-components via composition
  - `SidebarContextSection` - Customer selection, template picker, actions
  - `SidebarDataIoSection` - CSV/XLSX import/export
  - `SidebarToolsSection` - OCR upload, financial analysis, backup/restore
- Sub-components read from Zustand stores directly (no prop drilling)
- Sidebar state (`sidebarOpen`) added to `use-ui-store.ts`
- Escape key closes sidebar
- Proper ARIA attributes for accessibility

#### UI State Management
- Sidebar toggle integrated into toolbar (PanelRightOpen icon)
- OCR drag-over fallback preserved on canvas area
- DOCX merge tool extracted to modal (DocxMergeModal - 239 lines)
- First-use tooltip added to sidebar toggle

#### Bottom Status Bar
- **MappingStatusBar** new component (66 lines) with sticky positioning
- Left: Undo button + history count (0/5)
- Center: OCR status (pending count, log access link)
- Right: Field mapping progress (42/56 fields mapped)
- Ctrl+Z / Cmd+Z keyboard shortcut added for undo

#### Header Simplification
- Removed undo button (moved to bottom bar)
- Function list ("Danh sach ham") converted to icon-only BookOpen button with tooltip
- Sidebar embedding removed (now page-level component)
- Added gradient background: `from-violet-50 via-white to-fuchsia-50`
- Dark mode: `from-violet-950/30 via-[#141414] to-fuchsia-950/20`

#### Design System Consistency
- No legacy colors: removed all indigo, coral-tree, blue-chill references
- Consistent focus-visible rings: `ring-2 ring-violet-500/40`
- Button hierarchy: Primary (gradient), Secondary (border), Destructive (rose)
- Icon-only buttons: `rounded-lg p-2 hover:bg-violet-50`
- Spacing standardized: toolbar h-12, bottom bar h-10, sidebar 400px

#### File Organization
- All components under 200 LOC (DocxMergeModal: 239, justified by complexity)
- New sidebar sub-components modularized for maintainability
- Stores updated with sidebar state management

#### Code Quality
- Zero TypeScript errors
- Full dark mode support across new/modified components
- Spring animation for sidebar slide (damping: 28, stiffness: 300)
- Smooth height transitions for collapsible sections
- No duplicate actions between toolbar and sidebar

### Changed
- `src/app/report/mapping/components/MappingVisualToolbar.tsx` - Slimmed from 7 to 5 toolbar items
- `src/app/report/mapping/components/MappingSidebar.tsx` - Refactored to shell (137 lines)
- `src/app/report/mapping/stores/use-ui-store.ts` - Added sidebar state management
- `src/app/report/mapping/page.tsx` - Integrated status bar, sidebar toggles
- `src/app/report/mapping/components/MappingHeader.tsx` - Removed undo, simplified

### Technical Details
- Modularization: 1 large component split into 5 focused modules
- Sidebar state persisted in Zustand UI store (survives re-renders)
- OCR fallback uses canvas dragover detection
- Keyboard accessibility: Escape key, focus management, aria-labels
- Responsive design: Mobile-friendly sidebar animation, toolbar wrapping

## [Phase 49] - 2026-03-06

### Added - Invoice Deadline Email Notifications Feature

#### Database Models
- **Customer.email** - Optional email field for invoice deadline notifications
- **AppNotification.emailSentAt** - Tracks when email was sent
- **AppNotification.emailError** - Stores email sending errors for debugging

#### Services
- **email.service.ts** - Nodemailer integration for sending invoice reminders
  - `sendInvoiceReminder()` - Daily reminder emails 7 days before deadline
  - `sendInvoiceOverdue()` - Alert emails for overdue invoices
  - Graceful fallback when SMTP not configured (logs warning)
  - Email templates with customer name, invoice number, amount, due date

#### API Routes
- `GET /api/cron/invoice-deadlines` - Secure cron endpoint for daily deadline checks
  - Protected via `x-cron-secret` header
  - Finds invoices due within 7 days
  - Sends reminder emails and creates notifications
  - Marks invoices as overdue and sends alerts
  - Returns summary JSON

#### Auto DueDate Logic
- Invoice.dueDate auto-set to `disbursementDate + 1 month` on creation
- User can override via customDeadline field
- Applied in invoice.service.ts create() method

#### UI Enhancements
- Invoice dashboard grouped by customer with status summary
- Deadline countdown display (e.g., "Còn 3 ngày")
- Status badges: paid (green), due soon (yellow), overdue (red)
- Customer email field editable in UI
- Email delivery status shown in notification panel

#### Notification Deduplication
- 24-hour window prevents duplicate emails per invoice
- Checks AppNotification history before sending

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
| v1.6.0 | 2026-03-06 | Invoice Deadline Email Notifications |
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
- [x] Email notifications for invoice deadlines (completed Phase 49)
- [ ] Batch invoice import/export
- [ ] Invoice payment tracking
- [ ] Financial dashboards and analytics
- [ ] Multi-organization support
- [ ] PostgreSQL migration guide
- [ ] Job queue for background tasks (deadline scheduler, PDF generation)
- [ ] Mobile app
