# Phase 03 — API endpoint `/api/invoices/overdue-export`

## Context Links

- Scout: [`plans/reports/scout-260504-0752-thong-bao-no-chung-tu-export.md`](../reports/scout-260504-0752-thong-bao-no-chung-tu-export.md)
- Auth pattern: `src/app/api/invoices/summary/route.ts`.
- Depends on: Phase 01 (`collectDigestItems`), Phase 02 (`buildOverdueXlsxBuffer`).

## Overview

- Priority: P2.
- Status: pending.
- GET endpoint trả XLSX buffer. Yêu cầu session (`requireSession`). Filter qua query params.

## Requirements

- Functional:
  - Method: `GET`.
  - Query params:
    - `customerIds`: CSV string (e.g., `id1,id2`). Empty/missing → all customers (caller chịu trách nhiệm validate).
    - `types`: CSV `overdue,dueSoon,supplement`. Default: all 3.
  - Auth: session required. 401 nếu không.
  - Response: `200`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="no-chung-tu-{YYYYMMDD}.xlsx"`.
  - Error: 4xx/5xx JSON (`{ ok: false, error }`) qua `toHttpError` + `handleAuthError`.
- Non-functional: `runtime = "nodejs"` (xlsx cần Node Buffer).

## Architecture

```
GET /api/invoices/overdue-export?customerIds=...&types=...
  ├─ requireSession()
  ├─ parse query → opts
  ├─ snapshot = collectDigestItems(opts)
  ├─ buffer = buildOverdueXlsxBuffer(snapshot)
  └─ NextResponse(buffer, headers)
```

## Related Code Files

- Create: `src/app/api/invoices/overdue-export/route.ts`
- Read-only: `src/lib/auth-guard.ts`, `src/core/errors/app-error.ts`

## Implementation Steps

1. Create `src/app/api/invoices/overdue-export/route.ts`.
2. Imports: `NextResponse`, `requireSession`, `handleAuthError`, `toHttpError`, `collectDigestItems`, `buildOverdueXlsxBuffer`.
3. `export const runtime = "nodejs";`
4. `export async function GET(req: Request)`:
   - try:
     - `await requireSession();`
     - Parse `URL(req.url).searchParams`:
       - `customerIds` → `string[] | undefined` (split, trim, filter Boolean, undefined nếu empty).
       - `types` → `Array<"overdue"|"dueSoon"|"supplement"> | undefined`. Validate whitelist; nếu invalid type → bỏ.
     - `const snapshot = await collectDigestItems({ customerIds, types });`
     - `const buffer = buildOverdueXlsxBuffer(snapshot);`
     - Build filename: `no-chung-tu-${yyyymmdd}.xlsx` với `yyyymmdd` từ `new Date()`.
     - `return new NextResponse(buffer, { status: 200, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": \`attachment; filename="${filename}"\`, "Content-Length": String(buffer.length) } });`
   - catch: `handleAuthError` → if response, return; else `toHttpError` → `NextResponse.json({ ok:false, error }, { status })`.
5. `npm run build` verify.

## Todo List

- [ ] Create route file
- [ ] Parse + validate query params (`customerIds`, `types`)
- [ ] Call `collectDigestItems` + `buildOverdueXlsxBuffer`
- [ ] Set XLSX headers (Content-Type, Content-Disposition, Content-Length)
- [ ] Auth + error handling pattern (giống `summary/route.ts`)
- [ ] `npm run build` pass
- [ ] Manual cURL test với session cookie

## Success Criteria

- `GET /api/invoices/overdue-export` không session → 401.
- Có session, no params → trả file XLSX với data toàn bộ customer.
- `?types=overdue` → file có sheet "Quá hạn" có data, 2 sheet còn lại có header rỗng.

## Risk Assessment

- **Risk:** Buffer lớn (>10MB) timeout Vercel. **Mitigation:** Acceptable cho v1; nếu nhiều customer → khuyến nghị filter. Skip streaming (YAGNI).
- **Risk:** Filename có ký tự Việt. **Mitigation:** filename chỉ ASCII (`no-chung-tu-{YYYYMMDD}.xlsx`).

## Security Considerations

- `requireSession` chặn unauth.
- Không log query params chứa customerIds (PII liên kết).
- Snapshot trả ra buffer — không expose PII raw qua JSON.

## Next Steps

- Phase 04 build modal client gọi endpoint này.
