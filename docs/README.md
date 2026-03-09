# Project Documentation

Welcome to the comprehensive documentation for the Financial Reporting and Invoice Tracking Platform. This directory contains all technical, architectural, and operational documentation.

## Quick Navigation

### Getting Started

**New to the project?** Start here:

1. [**System Architecture**](./system-architecture.md) - Understand the overall design (10 min read)
2. [**Codebase Summary**](./codebase-summary.md) - Navigate the codebase structure (15 min read)
3. [**Invoice Tracking Guide**](./invoice-tracking-guide.md) - Learn the new invoice tracking feature (20 min read)

### Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [**System Architecture**](./system-architecture.md) | System design, data models, API overview | Architects, Senior Developers |
| [**Codebase Summary**](./codebase-summary.md) | Directory structure, file organization, services | All Developers |
| [**Invoice Tracking Guide**](./invoice-tracking-guide.md) | Feature walkthrough, API reference, usage guide | Developers, QA, Product |
| [**Project Changelog**](./project-changelog.md) | Version history, release notes, breaking changes | Project Managers, Team Leads |
| [**Development Roadmap**](./development-roadmap.md) | Planned phases, timelines, technical debt | Product Managers, Team Leads |

## Feature Documentation

### Invoice Tracking (Phase 48) - COMPLETE ✅

The Disbursement Invoice Tracking feature enables complete loan and invoice lifecycle management with automated deadline monitoring.

**Key Components:**
- 4 Prisma models (Loan, Disbursement, Invoice, AppNotification)
- 4 services with full CRUD operations
- 11 API endpoints
- Hourly deadline scheduler
- 5 UI pages
- 7 shared React components
- Browser push notifications
- Multi-language support (Vietnamese/English)

**Quick Start:** See [Invoice Tracking Guide](./invoice-tracking-guide.md)

### Other Features

See [Project Changelog](./project-changelog.md) for documentation of:
- OnlyOffice Integration (Phases 46-47)
- Report Mapping & Templates (Phase 45)
- Report Generation Engine (Phase 44)
- Customer Management (Phase 43)
- Document Processing (Phase 42)

## Development Information

### Setting Up Your Environment

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start

# Database management
npx prisma migrate dev     # Create/apply migrations
npx prisma studio          # Browse database
```

**Requirements:**
- Node.js 18+
- npm or yarn
- Python 3.8+ (for document processing)

### Code Organization

**Frontend:**
- `src/app/` - Next.js pages and API routes
- `src/components/` - React components
- `src/app/report/` - Report application pages

**Backend:**
- `src/services/` - Business logic and database operations
- `src/lib/` - Utilities, helpers, and third-party integrations
- `src/core/` - Core error handling and use cases

**Data:**
- `prisma/schema.prisma` - Database schema
- `src/lib/i18n/` - Internationalization strings

### Key Technologies

- **Framework:** Next.js 14+
- **Language:** TypeScript (strict mode)
- **Database:** SQLite (Prisma ORM)
- **Validation:** Zod
- **UI:** React + TailwindCSS
- **State Management:** Zustand
- **Testing:** Jest
- **API Style:** REST with JSON responses

## API Reference

### Base URL
```
/api
```

### Response Format

**Success:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "ok": false,
  "error": "Error message",
  "details": { ... }
}
```

### Main Endpoint Groups

- `GET/POST /api/loans` - Loan management
- `POST/GET/PUT/DELETE /api/disbursements` - Disbursement tracking
- `GET/POST /api/invoices` - Invoice management
- `GET/POST /api/notifications` - Notification system
- `GET/POST /api/customers` - Customer management
- `GET/POST /api/report/*` - Report operations

**Full API Reference:** See [Invoice Tracking Guide - API Reference](./invoice-tracking-guide.md#api-reference)

## Database Schema

The application uses SQLite with the following core models:

```
Customer
  ├─ Loan (loan agreements)
  ├─ MappingInstance (report field mappings)
  └─ [other related data]

Loan
  └─ Disbursement (fund tranches)
      └─ Invoice (supplier invoices)

AppNotification (deadline alerts and notifications)
FieldTemplateMaster (report field templates)
```

**Schema Definition:** `prisma/schema.prisma`

## Internationalization (i18n)

Supported languages:
- **Vietnamese (vi)** - Default
- **English (en)**

**Translation File:** `src/lib/i18n/translations.ts`

**Usage in Components:**
```typescript
const { t } = useLanguage();
t('invoice.status.pending') // Vietnamese or English based on user preference
```

## Testing

### Test Files
```
src/
├── core/errors/__tests__/
├── core/use-cases/__tests__/
├── app/report/mapping/__tests__/
└── lib/report/__tests__/
```

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

## Deployment

### Development
```bash
npm run dev
# Runs on http://localhost:3000
```

### Production
```bash
npm run build
npm start
# Runs on http://localhost:3000 (configurable)
```

### Environment Variables
Create `.env` file with:
```
DATABASE_URL=file:./prisma/dev.db
NEXT_PUBLIC_API_URL=http://localhost:3000
```

See `.env.example` for all available variables.

## Performance

### Current Benchmarks
- Create invoice: ~50ms
- List invoices (100 items): ~80ms
- Scheduler execution: ~100ms
- API response time: < 500ms (p99)

**Optimization Tips:** See [Invoice Tracking Guide - Performance](./invoice-tracking-guide.md#performance-metrics)

## Security

### Built-In Protections
- Input validation with Zod schemas
- Error message sanitization
- Database cascade delete safety
- JSON metadata isolation

### Future Enhancements (Phase 51)
- User authentication
- Role-based access control
- Audit logging
- API rate limiting

**Security Guide:** See [System Architecture - Security](./system-architecture.md#security-considerations)

## Troubleshooting

### Common Issues

**Deadline scheduler not running:**
1. Check app logs for "Starting hourly invoice deadline check"
2. Verify scheduler started in `src/app/layout.tsx`
3. Check browser console for errors

**Notifications not appearing:**
1. Verify NotificationBell component in sidebar
2. Check unread count in API
3. Ensure 60-second polling is active (DevTools Network)

**Invoices not marked overdue:**
1. Verify current date is past due date
2. Check invoice status is still "pending"
3. Manually trigger scheduler checks

**More Issues:** See [Invoice Tracking Guide - Troubleshooting](./invoice-tracking-guide.md#troubleshooting)

## Contributing

When adding new features or making changes:

1. **Update Documentation** - Keep these docs in sync with code
2. **Run Tests** - Ensure all tests pass: `npm test`
3. **Check Linting** - Fix any linting issues
4. **Update Changelog** - Add entry to [Project Changelog](./project-changelog.md)
5. **Update Roadmap** - Adjust [Development Roadmap](./development-roadmap.md) if needed

## Useful Links

### Project Files
- [README.md](../README.md) - Project overview
- [package.json](../package.json) - Dependencies and scripts
- [tsconfig.json](../tsconfig.json) - TypeScript configuration
- [next.config.ts](../next.config.ts) - Next.js configuration

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [React Documentation](https://react.dev)

## Documentation Maintenance

### Quarterly Review
- Update progress in [Development Roadmap](./development-roadmap.md)
- Add new entries to [Project Changelog](./project-changelog.md)
- Review and update [System Architecture](./system-architecture.md) if needed
- Verify all links and cross-references

### When to Update Docs
- New API endpoints added → Update [Invoice Tracking Guide](./invoice-tracking-guide.md)
- Phase completed → Update [Development Roadmap](./development-roadmap.md)
- Feature released → Update [Project Changelog](./project-changelog.md)
- Architecture changes → Update [System Architecture](./system-architecture.md)
- Code refactoring → Update [Codebase Summary](./codebase-summary.md)

## Contact & Support

For questions about:
- **Architecture & Design** → Check [System Architecture](./system-architecture.md)
- **Code Organization** → Check [Codebase Summary](./codebase-summary.md)
- **Invoice Tracking Feature** → Check [Invoice Tracking Guide](./invoice-tracking-guide.md)
- **Project Status & Roadmap** → Check [Development Roadmap](./development-roadmap.md)
- **Release History** → Check [Project Changelog](./project-changelog.md)

---

**Last Updated:** 2026-03-05
**Documentation Version:** 1.5.0 (Phase 48)
**Status:** Current & Maintained ✅
