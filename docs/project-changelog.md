# Project Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) conventions.

## [Unreleased]

## [v0.3.0] - 2026-04-25

### Added

- **KHCN Templates mở rộng** — tiêu dùng (có/không TSBĐ), nông nghiệp, cầm cố TTK, PASDV ngắn/trung dài hạn
- **Lộc Việt credit card loan type** — template và conditional UI riêng cho thẻ tín dụng
- **Loan method selector** — 36-month review section, Mẫu 20 template
- **Notification history modal** — pagination, filtering, đánh dấu đã đọc
- **Collateral selection cho KHCN asset templates** — chọn TSBĐ từ tab trong form
- **P0+P1 contract validation rules** — 6 validation rules cho core module contracts
- **6 module contracts** — customer, loan, disbursement, invoice, collateral, auth
- **Type B XLSX Parser** — smart section detection cho generic PAKD files (cost/revenue/summary)
  - `xlsx-number-utils.ts` — shared parseNum/parseDecimal cho Vietnamese number format
  - `xlsx-section-detector.ts` — auto-detect cost/revenue/summary sections
- **flower_type field** `[PA.Loại hoa]` — generalize nông nghiệp template label
- **asset_usage_status + owner fields** cho vehicle collateral form
- **36-month review section** và Mẫu 20 template

### Fixed

- Invoice "Đủ hóa đơn" badge: hiển thị đúng khi beneficiary coverage đủ; legacy `paid` → map sang badge xanh
- Invoice overdue logic: không đánh `overdue` cho invoice đã đủ hóa đơn (beneficiary `has_invoice`)
- Invoice countdown: không hiển thị đỏ "(Quá hạn X ngày)" cho invoice đã hoàn tất
- Overdue notification: gửi daily cho tất cả overdue, không chỉ first transition
- Loan search: bỏ `mode:insensitive` không hỗ trợ SQLite; fix conflict `customerType+search` WHERE
- Server PATCH: merge `data_json` phía server thay client-side spread, tránh 413 request
- Non-JSON server responses (413, 401): xử lý rõ ràng với error message
- `Danh xưng`: resolve từ mọi gender format (Ông/Bà/male/female/Nam/Nữ)
- Co-borrower + related-person PII fields: decrypt đúng trong KHCN report loader
- Disbursement report: decrypt customer PII trước khi render
- `documents_pa_json`: persist để TLPA loop render đúng
- `customer_type` (KHCN/KHDN): preserve khi import BK data
- Browser cache: fix ẩn KHCN templates mới thêm
- `loanPlanId` migration: thêm missing migration cho Turso production
- NLQ/TV loop: fix render cùng 1 người cho mọi row
- BaseModal: thêm nút X đóng modal

### Changed

- Disbursement page: refactor sang template alias system
- Invoice page: modernize UI với compact customer chips, email settings
- Customer info form: restyle 2-col grid nhất quán với SmartField
- Loan detail: inline status, contract edit, plan card UX improvements
- `months` calc: remove duplicate, cleanup trivial comments

## [v0.2.0] - 2026-03-19

### Major Release - KHCN Implementation Complete

#### New KHCN Customer Module
- **Customer Detail Page Redesign**
  - Tabbed interface for customer info, collateral, co-borrowers, credit info, loans
  - KHCN-specific fields (individual customer data)
  - Branch and staff management per customer
  - Document checklist for compliance tracking

#### Loan Plan Management
- **XLSX Loan Plan Parser**
  - Auto-detect column headers (Tên, Chi phí, Lãi suất, etc.)
  - Parse multi-row cost tables from Excel
  - Validate amounts and calculation formulas
  - Import with data preview before save

#### Collateral Management (7 Asset Categories)
- **Asset Types:**
  - `tai_san` - Land/Real estate with legal docs
  - `ts_qsd` - Usufruct land rights
  - `ts_glvd` - Legal document assets
  - `ts_ptgt` - Educational purpose assets
  - `bv` - Collateral/Guarantee items
  - `bt3_1` - Standard protection asset variant 1
  - `bt3_2` - Standard protection asset variant 2
- **Form-based data entry** with type-specific fields
- **Display component** showing all collateral by category
- **Amendment support** for prior contract collateral

#### Disbursement Module with Template Generation
- **Template-based DOCX generation**
  - UNC (Undertaking Note) template
  - BCDXGN (Disbursement Report) template
  - Multi-asset section cloning - repeater blocks auto-replicate for each collateral item
  - Auto-populate customer, loan, collateral, cost data
- **DOCX Preview capability**
  - View generated DOCX before download
  - Edit inline if needed via OnlyOffice
  - Download or save to system

#### OCR Document Scanner
- **Document capture from images/PDFs**
  - Auto-detect document type (CMND, financial statements, etc.)
  - Extract text and structured data
  - Field suggestion via OCR pipeline
  - Review and confirm extracted data
  - Batch processing support

#### Active Loan Selector
- **Loan selection widget** for quick access to active loans
- **Pre-populate disbursement forms** with loan details
- **Status filtering** (active, completed, cancelled)

#### Layout Redesign
- **Responsive grid layout** for desktop/tablet/mobile
- **Collapsible sections** for better mobile UX
- **Enhanced navigation** with breadcrumbs
- **Dark mode support** across all new KHCN pages

#### BK Multi-Asset Import
- **BK file parser** for bulk customer import
- **Map BK fields** to KHCN customer model
- **Preserve asset relationships** during import
- **Conflict resolution** for duplicate customers

#### Prior Contract Fields & Collateral Amendments
- **Prior contract tracking** - Link previous loan contracts
- **Collateral amendment support** - Track changes to collateral over time
- **Amendment metadata** (date, reason, status)

### Changed (v2.0.0)
- `src/app/report/customers/[id]/page.tsx` - Redesigned customer detail with tabs
- `src/app/report/customers/[id]/loan-plans/` - New loan plan pages with XLSX parser
- `prisma/schema.prisma` - Added KHCN-specific models and relationships
- `src/app/report/loans/[id]/disbursements/` - New disbursement pages with template generation
- `/src/app/report/customers/[id]/components/` - Multiple new KHCN-specific components

### Migration Notes
- Existing customers remain compatible with new KHCN fields
- Old reports continue to work (backward compatible)
- Some fields optional for non-KHCN customers

---

## [Phase 57] - 2026-03-14

### Added - Multi-Asset DOCX Clone Section Rendering

#### Multi-Asset Section Cloning
- **Repeater block support** in DOCX templates
- **Auto-generate sections** for each collateral item
- **Field mapping** for repeater rows (asset type, value, legal docs, etc.)
- **Proper section breaks** to avoid layout issues

#### Template Configuration
- **Define repeater zones** in DOCX via placeholder markers
- **Map source data** to repeater fields
- **Support nested repeaters** (collateral items with sub-documents)

#### Rendering Engine
- **Clone section logic** - Duplicate and populate section for each item
- **Placeholder replacement** in cloned sections
- **Cascade data** from parent (collateral) to child (documents)

### Changed (Phase 57)
- `src/services/disbursement-report.service.ts` - Multi-asset section cloning logic
- `src/services/report-generation-engine.ts` - Enhanced placeholder replacement for repeaters

---

## [Phase 56] - 2026-03-14

### Added - KHCN Collateral Data Builders & Template Registry

#### Collateral Data Builders
- **CollateralBuilder class** - Type-safe collateral data construction
- **Asset-specific builders** for each of 7 categories
- **Validation layer** for collateral data (required fields, format checks)
- **Serialization** for storage and reporting

#### Template Registry
- **TemplateRegistry** - Central repository for DOCX template metadata
- **Template discovery** - Auto-scan templates directory
- **Template versioning** - Track template versions
- **Template associations** - Link templates to loan types, collateral types, etc.

#### Configuration System
- **KHCN config schema** - Define available asset types, required fields
- **Field mapping config** - Map template placeholders to data fields
- **Validation rules** per asset type

### Changed (Phase 56)
- `src/services/collateral-builder.ts` - New data builder
- `src/services/template-registry.ts` - New template registry
- `src/config/khcn-config.ts` - New configuration schema

---

## [Phase 53] - 2026-03-09

### Added - Authentication & RBAC System (Better Auth v1.5.4)

#### Core Authentication
- **Better Auth v1.5.4** with Prisma SQLite adapter for production-ready auth
- **Email/password authentication** with invite-only signup (public signup disabled)
- **Session-based authentication** with 5-minute cookie caching to reduce DB round-trips
- **Two-role RBAC:** admin (full access + user management), viewer (read-only access)

#### Server-Side Components
- **src/lib/auth.ts** - Better Auth server configuration
  - Prisma adapter for SQLite/Turso databases
  - Email/password strategy with disableSignUp: true
  - Session cookie caching (5-min maxAge)
  - Admin plugin for role-based access control
- **src/lib/auth-guard.ts** - API guards for route protection
  - `requireSession()` - Validates session, throws 401 if missing
  - `requireAdmin()` - Validates admin role, throws 403 if not admin
  - `handleAuthError()` - Converts AuthError to NextResponse
- **middleware.ts** - Route protection at edge
  - Session cookie validation (fast, no DB call)
  - Protected routes: /report/**, /api/**
  - Public routes: /, /login, /api/auth/**
  - Cron & OnlyOffice routes: Have own auth (secrets, JWT)
  - Authenticated users redirected away from /login to /report/mapping

#### Client-Side Components
- **src/lib/auth-client.ts** - Better Auth client configuration
  - `authClient.signIn.email()` - Email/password sign-in
  - `authClient.signOut()` - Session termination
- **src/app/login/page.tsx** - Login form UI
  - Email/password form with validation
  - Error message display
  - Open redirect prevention (validated callbackUrl)
  - i18n support (vi/en)
  - Redirect authenticated users to /report/mapping
  - Loading state during sign-in

#### User Management
- **src/app/report/admin/users/page.tsx** - Admin user management page
  - List existing users with role display
  - Create new user form (email, password, role)
  - Delete user functionality
  - Admin-only access via requireAdmin() guard
- **prisma/seed-admin.ts** - Admin seed script
  - Email: admin@company.com
  - Password: changeme123!
  - Role: admin
  - Runs via: `npx prisma db seed`

#### Database Models
- **User** - Email (unique), name, role, hashed password
- **Session** - User sessions with expiryDate and token
- **Account** - OAuth provider support (prepared for future)
- **Verification** - Email verification tokens (prepared for future)
- **Relations** - User → Session, User → Account, User → Verification

#### Middleware Configuration
- Session cookie check (5-min cache hits reduce DB load)
- Protected page redirect: /login with callbackUrl query param
- Protected API return 401 with error JSON
- Skip auth for: /, /login, /api/auth/**, /api/cron/**, /api/onlyoffice/callback

#### i18n Translations
- Login form labels, placeholders, buttons
- Error messages (invalid credentials, auth required)
- Admin user management page (user list, form fields)
- Support for Vietnamese (vi) and English (en)

#### Security Features
- **Open Redirect Prevention** - Validated callbackUrl (starts with /, not //)
- **Password Hashing** - bcrypt via Better Auth
- **Session Tokens** - Secure random tokens with expiration
- **CSRF Protection** - Implicit via session-based auth (not OAuth)
- **Rate Limiting** - Foundation ready (not yet implemented)

### Changed
- `prisma/schema.prisma` - Added User, Session, Account, Verification models
- `src/app/layout.tsx` - Wrap with auth client provider
- `src/app/report/layout.tsx` - Added layout structure for /report/admin routes
- `src/lib/i18n/translations.ts` - Extended with auth UI strings

### Technical Details
- Better Auth version: 1.5.4
- Database adapter: Prisma (SQLite compatible)
- Session storage: Database (SQLite)
- Cookie caching: Enabled (5-min TTL)
- Default role: viewer (for new users created via admin panel)
- Admin roles: ["admin"]

---

## [Phase 51] - 2026-03-07

### Added - Toolbar Revamp with Modal-Based Customer & Template Selection

#### New Components
- **toolbar-action-button.tsx** - Shared icon button with tooltip, active/disabled states, dark mode support
- **CustomerPickerModal.tsx** - Select existing customers or create new ones inline
  - Search filter by name/code
  - Create new customer form (customer_code, customer_name, address)
  - API integration: POST /api/customers, GET /api/customers
  - Smooth animations with AnimatePresence
- **TemplatePickerModal.tsx** - Select/create/edit field templates
  - Sections: Customer-specific templates + Master templates
  - Search and filter capabilities
  - Action buttons: Create new, Apply template, Edit existing
  - Integration with useFieldTemplateStore

#### Toolbar Redesign
- Rewrite MappingVisualToolbar: 5 icon buttons center-aligned with 3 group separators
  - Group 1: Customer picker, Template picker
  - Group 2: Document upload, Financial analysis
  - Group 3: Sidebar toggle
- Search and filter UI moved to separate row below toolbar
- ToolbarActionButton component: Active states, disabled states, consistent styling

#### Sidebar Cleanup
- Removed: Customer context section (moved to CustomerPickerModal)
- Removed: Template picker dropdown (moved to TemplatePickerModal)
- Removed: OCR file upload button (moved to toolbar)
- Removed: Financial analysis button (moved to toolbar)
- Kept: Merge groups, DOCX merge, Backup/Restore, Import/Export
- sidebar-context-section.tsx deleted (functionality extracted to modals)
- sidebar-template-picker-dropdown.tsx deleted (functionality extracted to modals)
- sidebar-tools-section.tsx simplified: removed OCR and financial analysis props

#### Keyboard & Accessibility
- Escape key closes modals
- Tab order: toolbar → search → filters
- Focus-visible rings: `ring-2 ring-violet-500/40`
- ARIA roles and labels on buttons
- Active state indicators show customer/template selection status

#### Responsive Design
- Toolbar: `gap-1 md:gap-2` for mobile
- Modal widths adapt to viewport
- Search row wraps on mobile
- Button sizing: `p-2 md:p-2.5`

#### Dark Mode
- Full dark mode support across all new modals
- Consistent color scheme: `violet/fuchsia` with `dark:white/[0.08]` borders
- Verified across toolbar, modals, and sidebar

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
| v2.0.0 | 2026-03-19 | KHCN Implementation Complete - Collateral, Loan Plans, Disbursement Module, OCR, Layout Redesign |
| v1.9.1 | 2026-03-14 | Multi-Asset DOCX Clone Section Rendering |
| v1.9.0 | 2026-03-14 | KHCN Collateral Data Builders & Template Registry |
| v1.8.0 | 2026-03-09 | Authentication & RBAC System (Better Auth v1.5.4) |
| v1.7.0 | 2026-03-07 | Toolbar Revamp with Modal-Based Selection |
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

- [x] KHCN customer detail page redesign (completed v2.0.0)
- [x] XLSX loan plan parser with auto-detect (completed v2.0.0)
- [x] Collateral management (7 asset categories) (completed v2.0.0)
- [x] Disbursement module with template generation (completed v2.0.0)
- [x] OCR document scanner (completed v2.0.0)
- [x] DOCX preview before download (completed v2.0.0)
- [x] Multi-asset DOCX section cloning (completed v1.9.1)
- [x] Role-based access control (admin, viewer roles) (completed Phase 53)
- [x] Email notifications for invoice deadlines (completed Phase 49)
- [ ] Phase 58: Enhanced admin UI (edit user, deactivate account, view sessions)
- [ ] Phase 59: Audit logging for financial transactions
- [ ] Phase 60: Financial dashboards and analytics
- [ ] Batch invoice import/export
- [ ] Invoice payment tracking
- [ ] Multi-organization support
- [ ] PostgreSQL migration guide
- [ ] Job queue for background tasks (deadline scheduler, PDF generation)
- [ ] Mobile app
- [ ] Advanced reporting with pivot tables
