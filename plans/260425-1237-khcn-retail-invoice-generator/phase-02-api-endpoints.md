---
phase: 02
title: API Endpoints
status: completed
effort: S
blockedBy: phase-01
completed: 2026-04-25
---

# Phase 02 — API Endpoints

## 2 endpoints cần thêm/sửa

### 1. `GET /api/loan-plans/[id]/cost-items` (NEW)

Trả về cost_items từ LoanPlan để hiển thị item picker trong UI.

```ts
// src/app/api/loan-plans/[id]/cost-items/route.ts
export async function GET(_req, { params }) {
  const session = await requireSession();
  const { id } = await params;

  // Verify user has access to the loan plan's customer
  const plan = await prisma.loanPlan.findUnique({
    where: { id },
    select: { customerId: true, cost_items_json: true },
  });
  if (!plan) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (session.user.role !== "admin") {
    const ok = await checkCustomerAccess(plan.customerId, session.user.id);
    if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const costItems = JSON.parse(plan.cost_items_json ?? "[]");
  return NextResponse.json({ ok: true, costItems });
}
```

### 2. `POST /api/invoices/[id]/retail-doc` (NEW)

Generate DOCX retail invoice và trả về file download.

```ts
// src/app/api/invoices/[id]/retail-doc/route.ts
import { z } from "zod";

const bodySchema = z.object({
  templateType: z.enum(["tap_hoa", "vlxd", "y_te", "nong_san"]),
});

export async function POST(req, { params }) {
  const session = await requireEditorOrAdmin();
  const { id } = await params;

  // Verify access to invoice via chain
  if (session.user.role !== "admin") {
    const ok = await checkInvoiceAccess(id, session.user.id);
    if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { templateType } = bodySchema.parse(await req.json());
  const { buffer, filename } = await generateRetailInvoiceDoc(id, templateType);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
```

### 3. Cập nhật `invoice-crud.service.ts` — `createInvoice`

Cho phép `items` array và `templateType` trong input:

```ts
// Thêm vào CreateInvoiceInput type (invoice.service.ts hoặc invoice-crud.service.ts)
items?: Array<{ name: string; unit: string; qty: number; unitPrice: number; amount: number }>;
templateType?: string;

// Trong prisma.invoice.create:
data: {
  ...existing,
  items_json: input.items ? JSON.stringify(input.items) : null,
  templateType: input.templateType ?? null,
}
```

Khi `items` có, tính `amount = Σ item.amount` (override amount từ client):
```ts
if (input.items?.length) {
  input.amount = input.items.reduce((s, i) => s + i.amount, 0);
}
```

## Todo

- [ ] Tạo `src/app/api/loan-plans/[id]/cost-items/route.ts`
- [ ] Tạo `src/app/api/invoices/[id]/retail-doc/route.ts`
- [ ] Cập nhật `CreateInvoiceInput` type thêm `items?` + `templateType?`
- [ ] Cập nhật `createInvoice()` xử lý items_json và tính tổng
- [ ] `npx tsc --noEmit` — 0 errors

## Success Criteria

- `GET /api/loan-plans/[id]/cost-items` trả về array CostItem[]
- `POST /api/invoices/[id]/retail-doc` trả về DOCX file download
- Tạo invoice với items → `amount` được tính đúng từ items
