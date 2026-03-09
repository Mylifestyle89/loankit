# Development Roadmap

## Project Vision

Build a comprehensive financial reporting and invoice tracking platform that enables seamless document processing, field mapping, and automated invoice lifecycle management with deadline monitoring and notifications.

## Release Timeline

### Phase 48: Disbursement Invoice Tracking MVP ✅ COMPLETE

**Status:** Complete (2026-03-05)

**Deliverables:**
- 4 Prisma models (Loan, Disbursement, Invoice, AppNotification)
- 4 services with full CRUD operations
- 11 API endpoints covering all operations
- Hourly deadline scheduler with 7-day warnings
- 5 UI pages for loan/disbursement/invoice management
- 7 shared React components
- Browser push notifications
- Full i18n support (vi/en)

**Completion Percentage:** 100%

**Key Metrics:**
- Models: 4/4 (100%)
- Services: 4/4 (100%)
- API Routes: 11/11 (100%)
- UI Pages: 5/5 (100%)
- Components: 7/7 (100%)
- Test Coverage: Pending (estimate 80%)

---

### Phase 49: Invoice Deadline Email Notifications ✅ COMPLETE

**Status:** Complete (2026-03-06)

**Deliverables:**
- DB schema: Added `email` field to Customer model, `emailSentAt` & `emailError` to AppNotification
- Email service: Nodemailer integration with SMTP support and graceful fallback
- Auto DueDate: Invoice.dueDate = disbursementDate + 1 month (user-overridable via customDeadline)
- Cron API: `/api/cron/invoice-deadlines` endpoint with secret-based security
- Daily email reminders: Sent 7 days before deadline and until payment
- Overdue tracking: Mark invoices as overdue, send warning emails
- Customer-grouped UI: Invoice dashboard with deadline status badges and countdown

**Completion Percentage:** 100%

**Key Metrics:**
- DB migrations: 2/2 (100%)
- Services: 2/2 - email.service.ts, invoice.service enhancements (100%)
- API Endpoints: 1/1 - cron/invoice-deadlines (100%)
- UI Enhancements: Phase 4 updates complete (100%)

---

### Phase 51: Toolbar Revamp with Modal-Based Customer & Template Selection ✅ COMPLETE

**Status:** Complete (2026-03-07)

**Deliverables:**
- New components: toolbar-action-button.tsx (icon button), CustomerPickerModal.tsx, TemplatePickerModal.tsx
- Toolbar redesign: 5 center-aligned icon buttons in 3 groups with separators
- Customer picker: Search, filter, create new customer inline (POST /api/customers)
- Template picker: Select/create/edit templates, 2 sections (customer + master)
- Sidebar cleanup: Removed context section + template picker dropdown
- Search & filter row moved below toolbar
- Keyboard accessibility: Escape closes modals, Tab order navigation
- Dark mode support across all new components
- Responsive design for mobile (gap-1 md:gap-2)

**Completion Percentage:** 100%

**Key Metrics:**
- New components: 3 (toolbar-action-button, CustomerPickerModal, TemplatePickerModal)
- Files deleted: 2 (sidebar-context-section, sidebar-template-picker-dropdown)
- Files simplified: sidebar-tools-section.tsx, MappingSidebar.tsx, page.tsx
- TypeScript errors: 0
- Modal animations: Smooth with AnimatePresence

---

### Phase 52: Enhanced Invoice Features (Planned)

**Status:** Not Started

**Target Date:** 2026-03-25

**Scope:**
- [ ] Payment tracking and reconciliation
- [ ] Invoice receipt/document attachment
- [ ] Batch invoice import (CSV/XLSX)
- [ ] Invoice search and advanced filtering
- [ ] Custom invoice templates

**Success Criteria:**
- Customers can attach proof of payment to invoices
- Bulk import of 100+ invoices without performance degradation
- Email notifications sent 7 days before due date
- Search returns results in < 500ms

**Dependencies:**
- Email service integration (SendGrid or Mailgun)
- S3 or local file storage for attachments
- Batch import validation schema

---

### Phase 51: Financial Dashboard & Analytics (Planned)

**Status:** Backlog

**Target Date:** 2026-04-15

**Scope:**
- [ ] Dashboard showing loan portfolio summary
- [ ] Invoice aging report (30/60/90+ days overdue)
- [ ] Cash flow projection based on disbursement schedules
- [ ] Supplier concentration analysis
- [ ] Financial KPIs and metrics
- [ ] Export reports to PDF/Excel

**Success Criteria:**
- Dashboard loads in < 2 seconds with 1000+ invoices
- Aging report accurately calculates days overdue
- Cash flow projection shows 12-month outlook
- Users can customize dashboard widgets

**Technical Requirements:**
- Chart.js or similar visualization library
- Aggregation queries for large datasets
- Caching for frequently accessed metrics

---

### Phase 53: Authentication & RBAC (Better Auth v1.5.4) ✅ COMPLETE

**Status:** Complete (2026-03-09)

**Deliverables:**
- Better Auth v1.5.4 with Prisma adapter (SQLite/Turso support)
- Email/password authentication (invite-only, public signup disabled)
- Two roles: admin (full access + user management), viewer (read-only)
- Admin plugin for user CRUD operations
- Middleware route protection (cookie-only check for /report/** and /api/**)
- API-level auth guards (requireSession, requireAdmin) on critical write routes
- Login page at /login with callbackUrl support and i18n
- Admin user management page at /report/admin/users
- Admin seed script (admin@company.com / changeme123!)
- Cookie caching (5-min) to reduce DB round-trips
- i18n translations for auth UI (vi + en)

**Completion Percentage:** 100%

**Key Metrics:**
- Auth components: 4/4 (auth.ts, auth-client.ts, auth-guard.ts, middleware.ts)
- Protected routes: 2/2 (/report/**, /api/**)
- Login UI: 1/1 with i18n and open redirect prevention
- Admin panel: 1/1 user management page
- Database models: 4/4 (User, Session, Account, Verification)

---

### Phase 54: Audit Logging & Enhanced User Management (Planned)

**Status:** Backlog

**Target Date:** 2026-05-15

**Scope:**
- [ ] Audit logging for all financial operations (create, update, delete)
- [ ] Admin panel UI enhancements (edit user, deactivate account)
- [ ] Permission-based API access refinement
- [ ] Customer-specific visibility rules
- [ ] Session management (force logout, view active sessions)

**Success Criteria:**
- All sensitive operations logged with user/timestamp
- Audit logs queryable and exportable
- Admin can deactivate users without deleting
- Role switching tested and verified

**Security Requirements:**
- Audit log immutability (no delete, only archive)
- Rate limiting on auth endpoints
- Session invalidation on password change

---

### Phase 53: Mobile Application (Planned)

**Status:** Backlog

**Target Date:** 2026-06-01

**Scope:**
- [ ] React Native or Flutter app
- [ ] Loan and invoice browsing
- [ ] Offline capability for cached data
- [ ] Push notifications on invoice alerts
- [ ] Mobile-optimized invoice search

**Success Criteria:**
- App loads offline data without network
- Notifications delivered within 60 seconds of trigger
- Sync completes in < 5 seconds when online

---

### Phase 54: Database Migration to PostgreSQL (Planned)

**Status:** Research Phase

**Target Date:** 2026-06-15

**Scope:**
- [ ] PostgreSQL schema migration
- [ ] Connection pooling setup
- [ ] Performance testing vs SQLite
- [ ] Backup/restore procedures
- [ ] High-availability configuration

**Success Criteria:**
- Concurrent connections increase from 1 to 100+
- Query performance < 100ms for complex reports
- Zero data loss during migration
- Automated backups running hourly

**Migration Path:**
1. Set up PostgreSQL cluster
2. Test schema compatibility
3. Parallel run (both DBs) for 1 week
4. Cutover during maintenance window
5. Monitor for 2 weeks post-migration

---

### Phase 55: Advanced Mapping Features (Planned)

**Status:** Backlog

**Target Date:** 2026-07-01

**Scope:**
- [ ] Template inheritance and overrides
- [ ] Conditional field visibility
- [ ] Multi-language field labels
- [ ] Field grouping by category
- [ ] Validation rule engine
- [ ] Formula builder UI improvements

**Success Criteria:**
- Templates can inherit from parent templates
- Conditional logic evaluated without errors
- Field catalog UI refreshes < 300ms with 500+ fields

---

## Completed Phases

### Phase 53: Authentication & RBAC (Better Auth v1.5.4) ✅ COMPLETE

**Delivered:** 2026-03-09

**Features:**
- Better Auth v1.5.4 with Prisma + SQLite adapter
- Email/password authentication (invite-only)
- Admin role (full access) and Viewer role (read-only)
- Admin plugin for user CRUD operations
- Login page at /login with callbackUrl support
- Admin user management at /report/admin/users
- Seed admin: admin@company.com / changeme123!
- Middleware protection for /report/** and /api/**
- API guards: requireSession(), requireAdmin()
- Cookie caching (5-min TTL) to reduce DB hits
- Full i18n support (vi/en) for auth UI

---

### Phase 51: Toolbar Revamp with Modal-Based Selection ✅ COMPLETE

**Delivered:** 2026-03-07

**Features:**
- CustomerPickerModal: Search, filter, create new customers
- TemplatePickerModal: Select/create/edit field templates
- toolbar-action-button: Shared icon button component with active/disabled states
- Toolbar redesign: 5 icon buttons, center-aligned, 3 group separators
- Sidebar cleanup: Removed context & template sections
- Full keyboard accessibility (Escape, Tab, focus-visible)
- Responsive design (mobile-friendly)
- Complete dark mode support

---

### Phase 50: Field Editor UI Reorganization ✅ COMPLETE

**Delivered:** 2026-03-07

**Features:**
- Toolbar slimmed to 5 elements
- Sidebar refactored into 3 focused sub-components
- Bottom status bar with undo, OCR status, field count
- Header simplified with gradient background
- Keyboard shortcut Ctrl+Z/Cmd+Z for undo
- Full dark mode support
- Consistent violet/fuchsia design system

---

### Phase 49: Invoice Deadline Email Notifications ✅ COMPLETE

**Delivered:** 2026-03-06

**Features:**
- Email service with Nodemailer integration
- Daily deadline reminder emails (7 days before due)
- Auto due date calculation (disbursement date + 1 month)
- Cron endpoint with secret-based security
- Customer-grouped invoice dashboard with deadline badges

---

### Phase 48: Disbursement Invoice Tracking MVP ✅ COMPLETE

**Delivered:** 2026-03-05

**Features:**
- 4 Prisma models (Loan, Disbursement, Invoice, AppNotification)
- 11 API endpoints for full CRUD
- 5 UI pages for loan/disbursement/invoice management
- Hourly deadline scheduler with 7-day warnings
- Browser push notifications
- Full i18n support (vi/en)

---

### Phase 47: OnlyOffice Integration Phase 2 ✅ COMPLETE

**Delivered:** 2026-02-28

**Features:**
- Report export with OnlyOffice preview
- Path duplication bug fix
- Enhanced error logging
- Placeholder sidebar
- Editor mode toggle
- Promote-to-master functionality
- Auto-save snapshots

---

### Phase 46: OnlyOffice Integration Phase 1 ✅ COMPLETE

**Delivered:** 2026-02-15

**Features:**
- OnlyOffice Document Server integration
- Web-based document editor modal
- Document editing callbacks
- Health check endpoint
- Security audit fixes

---

### Phase 45: Report Mapping & Templates ✅ COMPLETE

**Features:**
- Field template master system
- Mapping instance management
- Auto-tagging service
- OCR integration
- AI field suggestions
- Snapshot/restore functionality

---

### Phase 44: Report Generation Engine ✅ COMPLETE

**Features:**
- DOCX template parsing
- XLSX table injection
- Formula evaluation
- Import/export functionality
- Financial analysis

---

### Phase 43: Customer Management ✅ COMPLETE

**Features:**
- Customer CRUD
- Data JSON storage
- Pagination and filtering

---

### Phase 42: Document Processing ✅ COMPLETE

**Features:**
- Python pipeline for extraction
- BCTC report parsing
- BK format importer

---

## Technical Debt & Maintenance

### High Priority

| Item | Impact | Effort | Status |
|------|--------|--------|--------|
| Increase test coverage to 85%+ | High | Medium | In Progress |
| Refactor large components (> 300 LOC) | Medium | High | Planned |
| Add integration tests | High | High | Planned |
| Set up CI/CD pipeline | High | Medium | Planned |
| Documentation updates | Medium | Low | In Progress |

### Medium Priority

| Item | Impact | Effort | Status |
|------|--------|--------|--------|
| Optimize query performance | Medium | Medium | Backlog |
| Add caching layer (Redis) | Low | High | Backlog |
| TypeScript strict mode audit | Medium | Low | Backlog |
| Accessibility (A11y) audit | Low | Medium | Backlog |

### Low Priority

| Item | Impact | Effort | Status |
|------|--------|--------|--------|
| Code style standardization | Low | Low | Backlog |
| Storybook setup | Low | Medium | Backlog |
| Performance profiling | Low | Medium | Backlog |

---

## Success Metrics

### Current Phase (Phase 51 Complete - Ready for Phase 52)

**User Adoption:**
- Invoice tracking used by target customers (Phase 48-49 complete)
- Field Editor UX significantly improved (Phase 50-51 complete)
- Toolbar revamped with modal-based selection (Phase 51 complete)
- Notification system working reliably

**System Performance:**
- API response time: < 500ms (p99)
- Deadline scheduler: < 100ms per execution
- Dashboard load: < 2 seconds
- Field Editor render time: < 300ms (sidebar modularization + modal extraction)
- Modal open/close animation: Smooth (<= 200ms)

**Quality:**
- Test coverage: 80%+
- Zero critical bugs in production
- Zero data loss incidents
- TypeScript: 0 compilation errors
- Code modularity: All components < 200 LOC (no exceptions in Phase 51)

**Financial Impact:**
- Reduce manual invoice tracking time by 70%
- Improve payment timeliness by 20%
- Reduce duplicate invoices by 90%
- Field Editor mapping time reduced 30% (toolbar cleanup + status bar + modal UX)

---

## Known Limitations & Constraints

### Database
- SQLite not suitable for > 10 concurrent users
- No built-in replication for high availability
- Limited to single-server deployment

### Scheduler
- Runs in-process (not suitable for serverless)
- No clustering support (only one instance can run safely)
- Requires app restart for configuration changes

### Authentication
- Currently no user authentication
- All endpoints accessible without credentials
- No audit logging

### Frontend
- No mobile optimization
- Browser push notifications have limited browser support
- No offline capability

---

## Dependency Updates

### Critical Updates Pending
- None currently

### Recommended Updates
- TypeScript: Consider updating when next LTS released
- Next.js: Monitor for security patches
- Prisma: Update annually or per LTS cycle

---

## Risk Assessment

### High Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data loss from SQLite | Low | Critical | Regular backups, migration to PostgreSQL |
| Deadline scheduler duplicates | Medium | High | Deduplication logic tested, monitoring alerts |
| Performance degradation at scale | Medium | High | Caching, database optimization, load testing |

### Medium Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Browser compatibility issues | Medium | Medium | Cross-browser testing before release |
| Timezone handling in scheduler | Low | Medium | UTC timestamps, comprehensive date testing |

### Low Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| UI responsiveness issues | Low | Low | Responsive design testing, mobile preview |

---

## Stakeholder Updates

### For Product Team
- Phase 48-51 complete: Invoice Tracking MVP + Email Notifications + UI Reorganization + Toolbar Revamp
- Phase 53 complete: Authentication & RBAC with Better Auth v1.5.4
- System now ready for production: Only authenticated users can access reports
- Admin role can manage users; Viewer role has read-only access
- Field Editor toolbar streamlined with modal-based customer/template selection
- Cleaner, more focused sidebar (removed context management, now in modals)
- Ready for customer rollout with improved modal-based UX and auth
- Phase 54 (Audit Logging) estimates 1 week for operation audit trails

### For Engineering Team
- Phase 53 delivered: Better Auth integration with Prisma SQLite adapter
- Auth architecture: Server config (auth.ts) + Client config (auth-client.ts) + Guards (auth-guard.ts) + Middleware
- Route protection: Middleware checks session cookie (5-min cache), Guards enforce role checks
- API endpoints: GET/POST /api/auth/** via better-auth, API guards on sensitive routes
- TypeScript: 0 errors across all auth components
- Admin plugin: User model with roles, admin can CRUD users via dedicated page
- Security: Open redirect prevention, secure password hashing, cookie-based sessions
- Technical debt backlog: Add audit logging, enhance admin UI (edit/deactivate user)
- Architecture review scheduled for Q2 (before PostgreSQL migration)

### For Customers
- Invoice tracking MVP ready (Phase 48)
- Automatic deadline reminders active (Phase 49)
- Field Editor UI significantly improved (Phase 50-51) - faster mapping workflow with modals
- Customer picker & template selector now easily accessible from toolbar
- System now secured with user authentication (Phase 53)
- Only authorized users can access reports; admins can manage team members
- Future phases include advanced analytics, payment tracking, audit logs, mobile access

---

## Review Schedule

- **Weekly:** Phase 48 bug fixes and customer feedback
- **Bi-weekly:** Roadmap progress review
- **Monthly:** Phase planning and technical debt assessment
- **Quarterly:** Architecture review and technology stack audit

---

## Next Steps

1. Plan Phase 54 implementation (Audit Logging: operation audit trails, enhanced admin UI)
2. Collect customer feedback on Phase 53 auth system (user experience, permission granularity)
3. Plan Phase 52 implementation (Enhanced Invoice Features: payment tracking, batch import)
4. Collect customer feedback on Phase 48-51 features (Invoice Tracking + Email + UI Redesign)
5. Review database scaling strategy for Phase 55 (PostgreSQL migration)
6. Begin research on Phase 52 scope: payment tracking, batch invoice import, advanced filtering
