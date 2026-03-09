# Scout Report: Auth, Registration & Login

**Mục tiêu:** Khảo sát codebase để lên plan implement phân quyền truy cập, đăng ký user và login

## Hiện trạng

### Không có auth
- **Không có middleware.ts** — không có route protection
- **Không có User model** trong Prisma schema
- **Không có auth library** trong package.json (no bcrypt, no next-auth, no better-auth)
- Tất cả 70+ API routes đều **public**, không cần token/session
- Landing page (`/`) link thẳng tới `/report/mapping` không qua login
- Roadmap Phase 52 đã plan RBAC nhưng chưa bắt đầu

### Kiến trúc hiện tại
- **Framework:** Next.js 16.1.6 (App Router)
- **DB:** SQLite via Prisma ORM (prisma-client-js)
- **State:** Zustand (client), no server-side session store
- **Deploy:** Vercel (serverless)
- **Existing JWT:** Chỉ dùng cho OnlyOffice (jsonwebtoken package đã có)

### Pages cần protect
```
/report/mapping          — Field editor (core feature)
/report/template         — Template management
/report/customers        — Customer CRUD
/report/customers/new    — Create customer
/report/customers/[id]   — Customer detail
/report/loans            — Loan list
/report/loans/new        — Create loan
/report/loans/[id]       — Loan detail
/report/disbursements/[id] — Disbursement detail
/report/invoices         — Invoice list
/report/system-operations — System ops
/report/runs             — Report runs
/report/guide            — User guide
```

### API Routes cần protect (70+ routes)
- `/api/customers/**`
- `/api/loans/**`
- `/api/disbursements/**`
- `/api/invoices/**`
- `/api/notifications/**`
- `/api/report/**` (mapping, template, build, export, etc.)
- `/api/onlyoffice/**` (đã có JWT riêng)
- `/api/cron/**` (đã có secret-based security)

## Relevant Files

### Schema & DB
- `prisma/schema.prisma` — Cần thêm User model, Session model
- `src/lib/prisma.ts` — Prisma client instance

### Entry points (cần wrap auth)
- `src/app/layout.tsx` — Root layout (thêm session provider)
- `src/app/report/layout.tsx` — Report layout (thêm auth guard)
- `src/app/page.tsx` — Landing page (redirect if logged in)

### Config
- `package.json` — Cần thêm auth dependencies
- `next.config.ts` — CSP headers, có thể cần update
- `.env` / `.env.local` — Auth secrets

### Existing security patterns
- `src/lib/onlyoffice/config.ts` — JWT sign/verify (có thể reuse pattern)
- `src/services/security.service.ts` — Xem có gì reuse
- `src/lib/report/file-token.ts` — File access tokens
- `src/lib/report/signed-file-url.ts` — Signed URLs

### Components cần update
- `src/app/report/layout.tsx` — Sidebar: thêm user info, logout button
- `src/components/language-provider.tsx` — Có thể store user preference

## Phân tích lựa chọn Auth Library

### Option 1: Better Auth (Recommended)
- TypeScript-first, framework-agnostic
- Built-in: email/password, OAuth, sessions, RBAC
- Prisma adapter available
- Skill `better-auth` đã có trong ClaudeKit

### Option 2: NextAuth.js v5 (Auth.js)
- Next.js native integration
- Mature ecosystem, large community
- Prisma adapter
- Session management built-in

### Option 3: Custom JWT (Not recommended)
- jsonwebtoken đã có trong project
- Nhưng phải tự build registration, session, CSRF, etc.
- Security risk cao nếu implement sai

## Roles (theo Roadmap Phase 52)
- **admin** — Full access, user management
- **manager** — CRUD on loans/invoices/reports, view audit logs
- **viewer** — Read-only access

## Deployment Considerations (Vercel)
- SQLite trên Vercel = ephemeral filesystem → sessions sẽ mất sau mỗi deploy
- Cần xem xét: dùng cookie-based sessions (JWT) hoặc migrate sang Turso/PostgreSQL
- Nếu giữ SQLite: Better Auth hỗ trợ JWT mode (stateless)

## Unresolved Questions
1. Dùng Better Auth hay NextAuth? (Better Auth có skill sẵn, TypeScript-first)
2. SQLite trên Vercel có phù hợp cho session storage? Hay cần migrate DB trước?
3. OAuth providers nào cần hỗ trợ? (Google, GitHub, hay chỉ email/password?)
4. Có cần invite-only registration hay public signup?
5. Audit logging level? (mọi API call hay chỉ write operations?)
6. MappingInstance.createdBy hiện hardcode "web-user" — cần map sang real user ID
