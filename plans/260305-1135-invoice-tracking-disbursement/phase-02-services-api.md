---
phase: 2
title: "Services + API Routes"
status: complete
effort: 4h
depends_on: [1]
completed: 2026-03-05
---

# Phase 2: Services + API Routes

## Context Links

- [Customer service pattern](../../src/services/customer.service.ts)
- [Customer API route](../../src/app/api/customers/route.ts)
- [Customer [id] route](../../src/app/api/customers/[id]/route.ts)
- [AppError hierarchy](../../src/core/errors/app-error.ts)
- [API helpers](../../src/lib/api-helpers.ts)
- [Phase 1 schema](./phase-01-database-schema.md)

## Overview

Create 4 service modules + 11 API route files. Follow existing plain-object service export pattern, Zod validation, `{ ok: true/false }` envelope. Includes Loan CRUD, Disbursement CRUD, Invoice CRUD with duplicate detection (invoiceNumber + supplierName), and Notification CRUD.

## Key Insights

- Services are plain object exports (not classes), throw AppErrors
- API routes: thin handlers, Zod parse, try/catch with `toHttpError()`
- Every route file: `export const runtime = "nodejs"`
- Params signature: `{ params: Promise<{ id: string }> }` (Next.js 15 async params)
- Surplus/deficit is a computed value, not stored -- calculate in service method

## Requirements

### Functional
- CRUD for Loans (scoped to customer)
- CRUD for Disbursements (scoped to loan)
- CRUD for Invoices (scoped to disbursement)
- Duplicate invoice detection on create: match **both** invoiceNumber + supplierName (non-blocking warning)
- Invoice summary aggregation per customer
- Surplus/deficit calculation per disbursement
- Auto-mark overdue invoices (scheduler in Phase 3)

### Non-functional
- Zod validation on all POST/PATCH bodies
- Consistent error envelope
- Services under 200 lines each

## Architecture

```
API Route -> Zod validate -> Service -> Prisma -> Response
                                     -> AppError (caught by toHttpError)
```

### Service Files (each <200 lines)

| Service | Responsibility |
|---------|---------------|
| `loan.service.ts` | Loan CRUD, scoped to customer |
| `disbursement.service.ts` | Disbursement CRUD, surplus/deficit calc, scoped to loan |
| `invoice.service.ts` | Invoice CRUD, duplicate detection (invoiceNumber + supplierName), status update |
| `notification.service.ts` | Create/list/read notifications |

### API Routes

| Route | Methods | File |
|-------|---------|------|
| `/api/loans` | GET, POST | `src/app/api/loans/route.ts` |
| `/api/loans/[id]` | GET, PATCH, DELETE | `src/app/api/loans/[id]/route.ts` |
| `/api/loans/[id]/disbursements` | GET, POST | `src/app/api/loans/[id]/disbursements/route.ts` |
| `/api/disbursements/[id]` | GET, PATCH, DELETE | `src/app/api/disbursements/[id]/route.ts` |
| `/api/disbursements/[id]/invoices` | GET, POST | `src/app/api/disbursements/[id]/invoices/route.ts` |
| `/api/invoices/[id]` | GET, PATCH, DELETE | `src/app/api/invoices/[id]/route.ts` |
| `/api/invoices/summary` | GET | `src/app/api/invoices/summary/route.ts` |
| `/api/notifications` | GET | `src/app/api/notifications/route.ts` |
| `/api/notifications/[id]/read` | PATCH | `src/app/api/notifications/[id]/read/route.ts` |
| `/api/notifications/mark-all-read` | POST | `src/app/api/notifications/mark-all-read/route.ts` |

## Related Code Files

### Create
- `src/services/loan.service.ts`
- `src/services/disbursement.service.ts`
- `src/services/invoice.service.ts`
- `src/services/notification.service.ts`
- `src/app/api/loans/route.ts`
- `src/app/api/loans/[id]/route.ts`
- `src/app/api/loans/[id]/disbursements/route.ts`
- `src/app/api/disbursements/[id]/route.ts`
- `src/app/api/disbursements/[id]/invoices/route.ts`
- `src/app/api/invoices/[id]/route.ts`
- `src/app/api/invoices/summary/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/[id]/read/route.ts`
- `src/app/api/notifications/mark-all-read/route.ts`

### Modify
- None (all new files)

## Implementation Steps

### 1. Create `src/services/loan.service.ts`

```typescript
export const loanService = {
  async list(customerId?: string) { ... },       // findMany, optional filter by customerId
  async getById(id: string) { ... },             // findUnique + include disbursements
  async create(input: CreateLoanInput) { ... },
  async update(id: string, input: UpdateLoanInput) { ... },
  async delete(id: string) { ... },
};
```

**Input types:**
```typescript
type CreateLoanInput = {
  customerId: string;
  contractNumber: string;
  loanAmount: number;
  interestRate?: number;
  startDate: string;  // ISO date
  endDate: string;    // ISO date
  purpose?: string;
};
type UpdateLoanInput = Partial<Omit<CreateLoanInput, "customerId">> & { status?: string };
```

### 2. Create `src/services/disbursement.service.ts`

```typescript
export const disbursementService = {
  async list(loanId?: string) { ... },           // findMany, optional filter by loanId
  async getById(id: string) { ... },             // findUnique + include invoices
  async create(input: CreateDisbursementInput) { ... },
  async update(id: string, input: UpdateDisbursementInput) { ... },
  async delete(id: string) { ... },
  async getSurplusDeficit(id: string) {           // SUM invoices vs disbursement amount
    const d = await prisma.disbursement.findUnique({
      where: { id },
      include: { invoices: { select: { amount: true } } },
    });
    if (!d) throw new NotFoundError("Disbursement not found.");
    const totalInvoice = d.invoices.reduce((s, i) => s + i.amount, 0);
    const diff = totalInvoice - d.amount;
    return { disbursementAmount: d.amount, totalInvoice, diff, label: diff > 0 ? "surplus" : diff < 0 ? "deficit" : "balanced" };
  },
};
```

**Input types:**
```typescript
type CreateDisbursementInput = {
  loanId: string;
  amount: number;
  disbursementDate: string; // ISO date string
  description?: string;
};
type UpdateDisbursementInput = Partial<Omit<CreateDisbursementInput, "loanId">> & { status?: string };
```

### 3. Create `src/services/invoice.service.ts`

```typescript
export const invoiceService = {
  async listByDisbursement(disbursementId: string) { ... },
  async getById(id: string) { ... },
  async create(input: CreateInvoiceInput) {
    // Step 1: Check duplicate by BOTH invoiceNumber + supplierName
    // (different suppliers can have the same invoice number — that's normal)
    const existing = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: input.invoiceNumber,
        supplierName: input.supplierName,
      },
    });
    const duplicateWarning = existing
      ? `Hóa đơn "${input.invoiceNumber}" từ "${input.supplierName}" đã tồn tại (ID: ${existing.id})`
      : null;

    // Step 2: Create notification if duplicate
    if (duplicateWarning) {
      await notificationService.create({
        type: "duplicate_invoice",
        title: "Trùng lặp hóa đơn",
        message: duplicateWarning,
        metadata: { invoiceNumber: input.invoiceNumber, supplierName: input.supplierName, disbursementId: input.disbursementId },
      });
    }

    // Step 3: Create invoice (non-blocking — still saves even if duplicate)
    const invoice = await prisma.invoice.create({ data: { ... } });
    return { invoice, duplicateWarning };
  },
  async update(id: string, input: UpdateInvoiceInput) { ... },
  async delete(id: string) { ... },
  async markOverdue() {
    // Called by scheduler: update all pending invoices past dueDate/customDeadline to "overdue"
    const now = new Date();
    return prisma.invoice.updateMany({
      where: {
        status: "pending",
        OR: [
          { customDeadline: { not: null, lt: now } },
          { AND: [{ customDeadline: null }, { dueDate: { lt: now } }] },
        ],
      },
      data: { status: "overdue" },
    });
  },
  async getCustomerSummary() {
    // Aggregate: per customer -> total loans, total disbursements, total invoices, total amount, pending count, overdue count
    // Use Prisma joins: Customer -> Loan -> Disbursement -> Invoice
  },
};
```

### 3. Create `src/services/notification.service.ts`

```typescript
export const notificationService = {
  async list(opts?: { unreadOnly?: boolean; limit?: number }) {
    return prisma.appNotification.findMany({
      where: opts?.unreadOnly ? { readAt: null } : undefined,
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
    });
  },
  async getUnreadCount() {
    return prisma.appNotification.count({ where: { readAt: null } });
  },
  async create(input: { type: string; title: string; message: string; metadata?: Record<string, unknown> }) {
    return prisma.appNotification.create({
      data: { ...input, metadata: JSON.stringify(input.metadata ?? {}) },
    });
  },
  async markRead(id: string) {
    return prisma.appNotification.update({ where: { id }, data: { readAt: new Date() } });
  },
  async markAllRead() {
    return prisma.appNotification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  },
};
```

### 4. Create API route files

Each follows this exact pattern (example for `GET/POST /api/loans`):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { loanService } from "@/services/loan.service";

export const runtime = "nodejs";

const createSchema = z.object({
  customerId: z.string().min(1),
  contractNumber: z.string().min(1),
  loanAmount: z.number().positive(),
  interestRate: z.number().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  purpose: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId") ?? undefined;
    const loans = await loanService.list(customerId);
    return NextResponse.json({ ok: true, loans });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to list loans.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.parse(body);
    const loan = await loanService.create(parsed);
    return NextResponse.json({ ok: true, loan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to create loan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
```

Example for `GET/POST /api/loans/[id]/disbursements`:
```typescript
// Disbursements scoped to a loan
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // loanId
  const disbursements = await disbursementService.list(id);
  return NextResponse.json({ ok: true, disbursements });
}
```

### 5. Invoice creation route includes `duplicateWarning` in response

```typescript
// POST /api/disbursements/[id]/invoices
const { invoice, duplicateWarning } = await invoiceService.create({ ...parsed, disbursementId: id });
return NextResponse.json({ ok: true, invoice, duplicateWarning });
```

### 6. GET `/api/notifications` returns both list and unread count

```typescript
export async function GET(req: NextRequest) {
  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
  const [notifications, unreadCount] = await Promise.all([
    notificationService.list({ unreadOnly }),
    notificationService.getUnreadCount(),
  ]);
  return NextResponse.json({ ok: true, notifications, unreadCount });
}
```

### 7. GET `/api/invoices/summary` returns customer aggregation

```typescript
// Returns: Array<{ customerId, customerName, totalDisbursements, totalInvoices, totalAmount, pendingCount, overdueCount }>
```

## Todo List

- [x] Create `loan.service.ts`
- [x] Create `disbursement.service.ts`
- [x] Create `invoice.service.ts` (with duplicate detection: invoiceNumber + supplierName)
- [x] Create `notification.service.ts`
- [x] Create `POST/GET /api/loans`
- [x] Create `GET/PATCH/DELETE /api/loans/[id]`
- [x] Create `GET/POST /api/loans/[id]/disbursements`
- [x] Create `GET/PATCH/DELETE /api/disbursements/[id]`
- [x] Create `POST/GET /api/disbursements/[id]/invoices`
- [x] Create `GET/PATCH/DELETE /api/invoices/[id]`
- [x] Create `GET /api/invoices/summary`
- [x] Create `GET /api/invoices` (added post-review)
- [x] Create `GET /api/notifications`
- [x] Create `PATCH /api/notifications/[id]/read`
- [x] Create `POST /api/notifications/mark-all-read`
- [x] Verify `tsc --noEmit` passes
- [x] Test endpoints with curl/Postman

## Success Criteria

- [x] All API routes return `{ ok: true, ... }` on success
- [x] All API routes return `{ ok: false, error: "..." }` on failure
- [x] Duplicate detection returns `duplicateWarning` field (non-blocking)
- [x] Surplus/deficit calculated correctly in disbursement detail
- [x] Invoice summary aggregates correctly per customer

## Implementation Summary

**4 Services Created:**
- `loan.service.ts` - CRUD for loans scoped to customer
- `disbursement.service.ts` - CRUD + getSurplusDeficit calculation
- `invoice.service.ts` - CRUD + duplicate detection (invoiceNumber + supplierName) + markOverdue
- `notification.service.ts` - Create/list/read/markAllRead notifications

**11 API Routes Created:**
- `/api/loans` (GET, POST)
- `/api/loans/[id]` (GET, PATCH, DELETE)
- `/api/loans/[id]/disbursements` (GET, POST)
- `/api/disbursements/[id]` (GET, PATCH, DELETE)
- `/api/disbursements/[id]/invoices` (GET, POST)
- `/api/invoices` (GET) - **Added post-review for C1 fix**
- `/api/invoices/[id]` (GET, PATCH, DELETE)
- `/api/invoices/summary` (GET)
- `/api/notifications` (GET)
- `/api/notifications/[id]/read` (PATCH)
- `/api/notifications/mark-all-read` (POST)

All routes use Zod validation, AppError handling, and `{ ok: true/false }` envelope pattern.

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Service files exceed 200 lines | Medium | Split helper functions into separate util files |
| SQLite GROUP BY limitations for summary | Low | Use multiple queries + JS aggregation if needed |

## Security Considerations

- Zod validation on all inputs prevents injection
- `toHttpError()` prevents leaking internal errors
- No auth layer (matches existing app pattern -- local tool)

## Next Steps

- Phase 3: Deadline scheduler that creates notifications automatically
- Phase 4: UI pages that consume these APIs
