---
phase: 2
title: "API Endpoint POST /api/loan-plans/import"
status: complete
effort: 1h
completed: 2026-03-15
---

# Phase 2: API Endpoint

## Overview
Create API route that accepts XLSX file upload, parses it, returns preview data. Separate confirm endpoint saves to DB.

## Files to Create

### `src/app/api/loan-plans/import/route.ts` (~80 lines)
POST handler:
1. Accept `multipart/form-data` with `file` (XLSX) + `customerId` (string)
2. Validate file size (<5MB), file extension (.xlsx/.xls)
3. Read buffer, call `parseXlsxLoanPlan(buffer)`
4. Return `XlsxParseResult` as JSON (preview only, no DB write)
5. Error handling: 400 for bad input, 422 for parse failure

```ts
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const customerId = formData.get("customerId") as string;
  // validate...
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = parseXlsxLoanPlan(buffer);
  return NextResponse.json(result);
}
```

### Save flow (no new endpoint needed)
After user confirms preview, frontend calls existing `POST /api/loan-plans` with:
```ts
{
  customerId,
  name: result.meta.name,
  cost_items: result.costItems,
  revenue_items: result.revenueItems,
  loanAmount: result.meta.loanAmount,
  interestRate: result.meta.interestRate,
  turnoverCycles: result.meta.turnoverCycles,
  tax: result.meta.tax,
}
```
This reuses `createPlanFromTemplate` in `loan-plan.service.ts` — no service changes needed.

## Implementation Steps
1. Create route file with formData parsing
2. Add file validation (size, type)
3. Wire to `parseXlsxLoanPlan`
4. Test with curl/Postman
5. Verify compile

## Success Criteria
- POST /api/loan-plans/import accepts XLSX, returns parsed preview
- Reuses existing POST /api/loan-plans for save (no new save endpoint)
- Proper error responses for invalid files
