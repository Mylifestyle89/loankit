# Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- SQLite3 (included in Node)
- Python 3.8+ (for document processing)
- OnlyOffice Document Server (optional, for document editing)

## Environment Setup

### 1. Database & Auth

Create `.env.local` with:

```env
# Database (SQLite)
DATABASE_URL="file:./prisma/dev.db"

# Better Auth (v1.5.4)
BETTER_AUTH_SECRET="<random-32-byte-key>"

# Cron endpoints
CRON_SECRET="<random-32-byte-key>"

# Optional: API & Services
NEXT_PUBLIC_API_URL="http://localhost:3000"
PYTHON_EXECUTABLE="/usr/bin/python3"

# Optional: OnlyOffice
ONLYOFFICE_API_URL="http://localhost:8080"
ONLYOFFICE_JWT_SECRET="<jwt-secret>"
```

**Generate secure keys:**
```bash
# 32-byte random key for BETTER_AUTH_SECRET and CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Database Migrations

```bash
# Create SQLite database and schema
npx prisma migrate deploy

# Seed admin account (email: admin@company.com, password: changeme123!)
npx prisma db seed
```

**Admin Credentials:**
- Email: `admin@company.com`
- Password: `changeme123!` (change immediately in production!)
- Role: `admin`

### 3. Install Dependencies

```bash
npm install
```

## Local Development

```bash
# Start dev server
npm run dev

# Access application
open http://localhost:3000
```

**First Login:**
1. Navigate to http://localhost:3000/login
2. Enter admin@company.com / changeme123!
3. You'll be redirected to /report/mapping (field editor)
4. To access admin panel, go to /report/admin/users

## Production Build

```bash
# Build application
npm run build

# Run production server
npm start
```

## Protected Routes

### Authentication Requirements

**Middleware enforces session validation:**

| Route | Type | Auth Required | Details |
|-------|------|---------------|---------|
| `/` | Page | No | Public home page |
| `/login` | Page | No | Login form; redirects authenticated users to /report/mapping |
| `/report/**` | Page | Yes | Redirect to /login if no session |
| `/api/auth/**` | API | No | Better Auth endpoints (sign-in, sign-out, get session) |
| `/api/loans` | API | Yes | 401 if no session |
| `/api/customers` | API | Yes | 401 if no session |
| `/api/invoices` | API | Yes | 401 if no session |
| `/api/cron/**` | API | Secret | Requires x-cron-secret header |
| `/api/onlyoffice/callback` | API | JWT | OnlyOffice server-to-server auth |

### API-Level Guards

**Sensitive write routes protected by role:**

```typescript
// Requires session + admin role
requireAdmin() - throws 403 if user.role !== "admin"

// Requires session (any authenticated user)
requireSession() - throws 401 if no session
```

**Protected endpoints (admin-only):**
- `POST/DELETE /api/admin/users/*` - User management

## Role-Based Access Control

### Roles

| Role | Permissions | Access |
|------|-------------|--------|
| `admin` | Full access (CRUD all) + User management | /report/**, /report/admin/users |
| `viewer` | Read-only access (GET only) | /report/** (reports, invoices, loans) |

### Admin User Management

**URL:** `/report/admin/users` (admin-only)

**Features:**
- List all users with email, name, role
- Create new user (email, password, role)
- Delete user
- Change password via API (role management in UI coming soon)

## Scheduled Tasks

### Deadline Scheduler

**Purpose:** Check invoice deadlines hourly

**Configuration:**
- Runs automatically on app startup
- Checks every 60 minutes
- Identifies invoices due within 7 days
- Creates notifications and sends emails (if configured)

**Location:** `src/lib/notifications/deadline-scheduler.ts`

### Cron Endpoints

**Endpoint:** `GET /api/cron/invoice-deadlines`

**Authentication:** `x-cron-secret` header (set in env)

**Purpose:** Manual trigger for deadline checks (can be called by external cron service)

**Example:**
```bash
curl -H "x-cron-secret: <CRON_SECRET>" \
  http://localhost:3000/api/cron/invoice-deadlines
```

## Email Notifications (Optional)

**Setup:** Email service configuration in `.env.local`

```env
# Nodemailer SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@company.com"
```

**Features:**
- Invoice deadline reminders (7 days before due date)
- Overdue invoice alerts
- Customer email required in Customer model

## Language & Localization

**Supported Languages:** Vietnamese (vi), English (en)

**Default:** Vietnamese

**Files:**
- `src/lib/i18n/translations.ts` - All translation strings
- Login UI and admin pages support i18n
- Invoice tracking components fully localized

## Security Checklist

- [ ] Change admin password immediately (`admin@company.com`)
- [ ] Set `BETTER_AUTH_SECRET` to a strong random value
- [ ] Set `CRON_SECRET` for cron endpoints
- [ ] Use HTTPS in production
- [ ] Restrict database file permissions (SQLite)
- [ ] Run regular database backups
- [ ] Monitor failed login attempts
- [ ] Update dependencies regularly

## Database Backup

**SQLite Backup:**
```bash
# Copy database file
cp prisma/dev.db prisma/dev.db.backup

# Or use SQLite backup command
sqlite3 prisma/dev.db ".backup prisma/dev.db.backup"
```

**Restore:**
```bash
cp prisma/dev.db.backup prisma/dev.db
```

## Monitoring & Logs

**Application Logs:**
- All errors logged to stdout
- Session validation failures logged
- API errors include request context

**Recommended Monitoring:**
- Track failed login attempts
- Monitor deadline scheduler execution time
- Watch for 401/403 auth errors in logs

## Scaling Considerations

### SQLite Limitations
- Single-user/small-team deployments only
- Not suitable for high-concurrency production
- No built-in replication

### Migration to PostgreSQL

For production scaling, consider migrating to PostgreSQL:

```bash
# Prisma supports PostgreSQL with same schema
# Update DATABASE_URL to PostgreSQL connection string
# Run migrations: npx prisma migrate deploy
```

See `development-roadmap.md` Phase 55 for detailed migration plan.

## Troubleshooting

### Issue: "Unauthorized" on API routes

**Solution:** Ensure session cookie is valid and not expired
```bash
# Check middleware is protecting routes
# Verify BETTER_AUTH_SECRET matches between .env and build
```

### Issue: Admin panel returns 403

**Solution:** User must have `admin` role
```bash
# Verify user role in database
sqlite3 prisma/dev.db "SELECT email, role FROM User WHERE email='your-email';"

# Update role if needed (use admin panel or SQL)
sqlite3 prisma/dev.db "UPDATE User SET role='admin' WHERE email='your-email';"
```

### Issue: Deadline scheduler not running

**Solution:** Check app initialization
```bash
# Ensure src/app/layout.tsx calls startDeadlineScheduler()
# Check logs for scheduler startup message
```

### Issue: Open redirect vulnerability warning

**Solution:** Login validates callbackUrl
- Only relative URLs allowed (starts with `/`, not `//`)
- Authenticated users redirected automatically

## Deployment Platforms

### Vercel (Recommended for Next.js)

```bash
# Deploy via Vercel CLI
npm i -g vercel
vercel

# Set environment variables in Vercel Dashboard
```

**Database:** Use Turso for managed SQLite:
```env
DATABASE_URL="libsql://... (from Turso)"
```

### Self-Hosted (VPS/Docker)

**Requirements:**
- Node.js 18+ environment
- Persistent storage for SQLite database
- Environment variables via .env.local or system env

**Example Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

## Performance Optimization

### Session Cookie Caching

Better Auth caches session validation for 5 minutes:
- First request validates session in database
- Subsequent requests use cached session (no DB hit)
- Reduces database load by ~80% in typical usage

### Database Indexes

Strategic indexes on:
- `User.email` (unique)
- `User.role` (for permission checks)
- `Session.expiresAt` (for cleanup queries)
- `Invoice.dueDate` (for deadline queries)

## Maintenance Tasks

### Weekly
- Monitor failed login attempts
- Review error logs for auth failures

### Monthly
- Back up database
- Review user access (deactivate unused accounts)
- Update dependencies if security patches available

### Quarterly
- Audit user roles and permissions
- Plan for PostgreSQL migration if scaling needed

## Support & Documentation

- **System Architecture:** See `system-architecture.md`
- **Codebase Summary:** See `codebase-summary.md`
- **Development Roadmap:** See `development-roadmap.md`
- **Better Auth Docs:** https://www.better-auth.com/
- **Prisma Docs:** https://www.prisma.io/docs/
