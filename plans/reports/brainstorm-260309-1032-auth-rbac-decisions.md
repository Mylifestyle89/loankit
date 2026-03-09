# Brainstorm: Auth, Registration & RBAC

**Ngày:** 2026-03-09 | **Trạng thái:** Agreed

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Auth library | Better Auth (TS-first, RBAC built-in) |
| Registration | Invite-only (admin tạo account) |
| OAuth | Email/password only (mở rộng sau) |
| DB | Giữ SQLite/Turso + JWT stateless sessions |
| Roles | admin + viewer trước, thêm manager sau |

## Context
- 70+ API routes hiện public, không có auth
- Next.js 16.1.6 App Router + Prisma + SQLite
- Deploy trên Vercel (serverless)
- Financial internal tool — cần bảo mật cao

## Scout Report
- `plans/reports/scout-260309-1027-auth-rbac-codebase-analysis.md`
