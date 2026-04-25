# Phase 02 — API Endpoint + Service Method

**Status:** complete
**Priority:** High
**Effort:** Small (~40 LOC)

## Context

- `loanId` đã có sẵn trong modal → dùng làm param, không cần expose `customerId` ra frontend
- Prisma: `Loan` có `customerId` → join để lấy tất cả disbursements của cùng customer
- Pattern API tham khảo: `src/app/api/loans/[id]/disbursements/route.ts`
- Pattern service tham khảo: `src/services/disbursement.service.ts`

## 1. Service Method

**File:** `src/services/disbursement.service.ts`

Thêm method `getFieldSuggestions(loanId: string)`:

```typescript
/** Returns distinct non-empty values for suggestion fields across all disbursements of the same customer */
async getFieldSuggestions(loanId: string): Promise<{
  principalSchedule: string[];
  interestSchedule: string[];
  purpose: string[];
}> {
  // Get customerId from the loan
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { customerId: true },
  });
  if (!loan) return { principalSchedule: [], interestSchedule: [], purpose: [] };

  // Get all sibling loans for this customer
  const siblingLoanIds = await prisma.loan.findMany({
    where: { customerId: loan.customerId },
    select: { id: true },
  });
  const loanIds = siblingLoanIds.map(l => l.id);

  // Query distinct values for each field
  const rows = await prisma.disbursement.findMany({
    where: { loanId: { in: loanIds } },
    select: {
      principalSchedule: true,
      interestSchedule: true,
      purpose: true,
    },
  });

  const collect = (key: "principalSchedule" | "interestSchedule" | "purpose") =>
    [...new Set(rows.map(r => r[key]).filter((v): v is string => !!v?.trim()))];

  return {
    principalSchedule: collect("principalSchedule"),
    interestSchedule:  collect("interestSchedule"),
    purpose:           collect("purpose"),
  };
}
```

**Note:** Dùng `findMany` + JS dedup thay vì `groupBy` vì số lượng disbursements per customer nhỏ (< vài trăm). Không cần optimize thêm.

## 2. API Route

**File:** `src/app/api/loans/[id]/disbursement-suggestions/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { toHttpError } from "@/core/errors/app-error";
import { disbursementService } from "@/services/disbursement.service";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireEditorOrAdmin();
  } catch (e) {
    return handleAuthError(e);
  }
  try {
    const suggestions = await disbursementService.getFieldSuggestions(params.id);
    return NextResponse.json({ ok: true, suggestions });
  } catch (e) {
    return NextResponse.json(toHttpError(e), { status: 500 });
  }
}
```

**Response shape:**
```json
{
  "ok": true,
  "suggestions": {
    "principalSchedule": ["Hàng tháng", "Hàng quý"],
    "interestSchedule": ["Hàng tháng"],
    "purpose": ["Mua vật tư nông nghiệp", "Sản xuất kinh doanh"]
  }
}
```

## Auth

Dùng `requireEditorOrAdmin()` — nhất quán với các GET endpoints khác trong cùng loan context.

## Success Criteria

- `GET /api/loans/{loanId}/disbursement-suggestions` trả `200` với đúng shape
- Values là DISTINCT, không có empty string, không có null
- Nếu loan không tồn tại → trả `{ ok: true, suggestions: { ... } }` với arrays rỗng (graceful)
- Auth: 401 nếu không login
- TypeScript compile clean
