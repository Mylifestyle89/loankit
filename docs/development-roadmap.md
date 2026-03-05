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

### Phase 49: Enhanced Invoice Features (Planned)

**Status:** Not Started

**Target Date:** 2026-03-20

**Scope:**
- [ ] Payment tracking and reconciliation
- [ ] Invoice receipt/document attachment
- [ ] Batch invoice import (CSV/XLSX)
- [ ] Invoice search and advanced filtering
- [ ] Custom invoice templates
- [ ] Email notifications for deadlines

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

### Phase 50: Financial Dashboard & Analytics (Planned)

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

### Phase 51: Role-Based Access Control (Planned)

**Status:** Backlog

**Target Date:** 2026-05-01

**Scope:**
- [ ] User authentication system
- [ ] Role definitions (admin, manager, viewer)
- [ ] Permission-based API access
- [ ] Audit logging for all financial operations
- [ ] Customer-specific visibility rules

**Success Criteria:**
- Users cannot access data outside their permissions
- All sensitive operations logged with user/timestamp
- Role switching tested and verified
- Audit logs queryable and exportable

**Security Requirements:**
- Password hashing (bcrypt)
- JWT or session-based auth
- HTTPS enforcement
- Rate limiting on auth endpoints

---

### Phase 52: Mobile Application (Planned)

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

### Phase 53: Database Migration to PostgreSQL (Planned)

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

### Phase 54: Advanced Mapping Features (Planned)

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

### Current Phase (Phase 48)

**User Adoption:**
- Invoice tracking used by target customers
- Notification system working reliably

**System Performance:**
- API response time: < 500ms (p99)
- Deadline scheduler: < 100ms per execution
- Dashboard load: < 2 seconds

**Quality:**
- Test coverage: 80%+
- Zero critical bugs in production
- Zero data loss incidents

**Financial Impact:**
- Reduce manual invoice tracking time by 70%
- Improve payment timeliness by 20%
- Reduce duplicate invoices by 90%

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
- Phase 48 (Invoice Tracking) complete and ready for customer rollout
- Phase 49 (Enhanced Features) estimates 2 weeks for payment tracking + email notifications
- Dashboard (Phase 50) provides critical business intelligence for stakeholders

### For Engineering Team
- All completed phases have comprehensive code documentation
- Technical debt backlog prioritized by impact
- Architecture review scheduled for Q2 (before PostgreSQL migration)

### For Customers
- New invoice tracking functionality available immediately
- Automatic deadline reminders reduce manual follow-ups
- Future phases include advanced analytics and mobile access

---

## Review Schedule

- **Weekly:** Phase 48 bug fixes and customer feedback
- **Bi-weekly:** Roadmap progress review
- **Monthly:** Phase planning and technical debt assessment
- **Quarterly:** Architecture review and technology stack audit

---

## Next Steps

1. Collect customer feedback on Phase 48 features
2. Plan Phase 49 implementation (2-week sprint)
3. Schedule QA testing for Phase 48 completeness
4. Review database scaling strategy for Phase 53
5. Finalize authentication design for Phase 51
