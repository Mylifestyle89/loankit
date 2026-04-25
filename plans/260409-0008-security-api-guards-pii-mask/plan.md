# Security Fix: API Auth Guards + PII Mask Completeness

**Created:** 2026-04-09
**Priority:** P0 (blocker production)
**Status:** Ready
**Scope:** 6 files, ~50 LOC changes

## Big Picture

Codex audit tìm 2 lỗ hổng thật sau khi verify code:
1. **5 route `/api/report/*` không có auth guard** — chỉ proxy chặn cookie presence, viewer/editor/admin đều gọi được. Bulk export toàn bộ PII customers có thể bị lạm dụng.
2. **`maskCustomerResponse` chỉ mask 4/8 PII fields** được encrypt — 4 fields (`cccd_old, bank_account, spouse_name, email`) decrypt rồi trả plaintext trong mọi response.

## Decisions (đã chốt với user)

| Câu hỏi | Quyết định |
|---------|-----------|
| Viewer role có được gọi mapping/export không? | Chỉ GET các route read-only. Mutations + bulk export → editor+ |
| `/api/report/state` cần guard gì? | `requireSession()` — chỉ framework metadata, không PII |
| Mask strategy 4 fields mới | Keep tail (giống cif/cccd) — thêm 3 mask types: `email`, `account`, `name` |

## Guard Matrix

| Route | Method | Guard | Rationale |
|-------|--------|-------|-----------|
| `/api/report/state` | GET | `requireSession` | Metadata, viewer OK |
| `/api/report/mapping` | GET | `requireSession` | Viewer cần xem mapping hiện hành |
| `/api/report/mapping` | PUT | `requireEditorOrAdmin` | Draft mutation |
| `/api/report/mapping` | POST | `requireEditorOrAdmin` | Publish mutation |
| `/api/report/export-data` | GET | `requireEditorOrAdmin` | Bulk PII export — viewer không cần |
| `/api/report/export-data` | POST | `requireEditorOrAdmin` | Bulk PII export |
| `/api/report/import-data` | POST | `requireEditorOrAdmin` | Mutation ghi DB |

**Lý do export không cho viewer:** bulk dump JSON/XLSX toàn bộ customers (kể cả đã mask qua service layer) nhưng `exportDataStream` gọi `decryptCustomerPii` → trả plaintext trong file. Nếu viewer cần audit → dùng snapshot/backup riêng.

## Phases

### Phase 1 — API Auth Guards
**Files:**
- `src/app/api/report/state/route.ts` — thêm `requireSession` + `handleAuthError`
- `src/app/api/report/mapping/route.ts` — GET `requireSession`, PUT/POST `requireEditorOrAdmin`
- `src/app/api/report/export-data/route.ts` — GET/POST `requireEditorOrAdmin`
- `src/app/api/report/import-data/route.ts` — POST `requireEditorOrAdmin`

**Pattern (theo `customers/route.ts` đã có):**
```typescript
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    await requireSession(); // hoặc requireEditorOrAdmin
    // ... logic hiện tại
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "...");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
```

**Note cho mapping PUT:** hiện dùng `withErrorHandling(withValidatedBody(...))`. Thêm guard bên trong handler wrap, trước khi gọi service. Verify `withErrorHandling` không nuốt `AuthError` — commit `e51a04e` đã fix cái này cho `withValidatedBody`, check lại `withErrorHandling`.

**Import-data note:** bỏ luôn `details: validationError.details` khỏi response (dòng 44) — log server thôi, tránh lộ schema.

### Phase 2 — PII Mask Completeness
**File:** `src/lib/field-encryption.ts`

**Thay đổi:**
1. Mở rộng `MASK_CONFIG` thêm 3 type mới:
```typescript
const MASK_CONFIG = {
  cif:     { keepStart: 0, keepEnd: 4 }, // ****1234
  phone:   { keepStart: 3, keepEnd: 3 }, // 091****678
  cccd:    { keepStart: 2, keepEnd: 3 }, // 07****234
  account: { keepStart: 0, keepEnd: 4 }, // ****5678 (bank_account)
  email:   { keepStart: 2, keepEnd: 4 }, // ab****.com
  name:    { keepStart: 1, keepEnd: 1 }, // N***A (spouse_name)
} as const;
```

2. Mở rộng `maskMap` trong `maskCustomerResponse`:
```typescript
const maskMap: Record<string, PiiType> = {
  customer_code: "cif",
  phone: "phone",
  cccd: "cccd",
  spouse_cccd: "cccd",
  cccd_old: "cccd",       // NEW
  bank_account: "account", // NEW
  spouse_name: "name",     // NEW
  email: "email",          // NEW
};
```

3. **Invariant kiểm tra:** `PII_CUSTOMER_FIELDS` phải đồng bộ với `maskMap`. Thêm assertion hoặc comment warning ngay trên `PII_CUSTOMER_FIELDS`:
```typescript
/** PII fields on Customer that need encryption. MUST match maskMap
 *  keys in maskCustomerResponse — adding a field here without updating
 *  mask leaks plaintext. */
```

### Phase 3 — Manual Verification (không auto test)
- [ ] Build pass: `npm run build` hoặc `npm run lint`
- [ ] Login viewer → GET `/api/report/state` → 200; PUT `/api/report/mapping` → 403
- [ ] Login viewer → GET `/api/report/export-data` → 403
- [ ] Login editor → full flow export/import/mapping → 200
- [ ] GET `/api/customers` list → verify 4 fields mới (`email, bank_account, spouse_name, cccd_old`) đã mask
- [ ] GET `/api/customers/[id]?reveal=all` với editor → verify plaintext 8 fields
- [ ] GET `/api/customers/[id]?reveal=all` với viewer → 403

## Files Changed

| File | LOC delta |
|------|-----------|
| `src/app/api/report/state/route.ts` | +6 |
| `src/app/api/report/mapping/route.ts` | +12 |
| `src/app/api/report/export-data/route.ts` | +10 |
| `src/app/api/report/import-data/route.ts` | +6 (−1 `details` leak) |
| `src/lib/field-encryption.ts` | +8 |

## Rủi Ro

| Risk | Mitigation |
|------|-----------|
| Viewer đang dùng export/mapping mutate → bị block sau fix | User đã xác nhận viewer chỉ GET |
| `withErrorHandling` wrap PUT mapping vẫn nuốt AuthError | Verify + fix theo pattern commit `e51a04e` nếu cần |
| Mask mới làm UI hỏng (vì format khác) | Keep style tương đồng cif/cccd, test UI customer list |
| Email với `@` → `maskMiddle` có handle không? | `maskMiddle` là generic slice, OK cho string bất kỳ |

## Không Làm (out of scope)

- Không sửa CSP `unsafe-eval` (user quyết pass)
- Không sửa rate-limiter global fallback (known design)
- Không viết test matrix tự động (defer)
- Không tăng password complexity (low risk, defer)

## Câu Hỏi Còn Lại

1. `withErrorHandling` có nuốt `AuthError` không? Cần check [src/lib/api/with-error-handling.ts](src/lib/api/with-error-handling.ts) trước khi fix mapping PUT.
2. Email mask style — OK với "ab****il.com" hay muốn "a***@gmail.com" (keep domain)? Plan dùng generic maskMiddle cho đơn giản; nếu muốn custom, Phase 2 cần tách `maskEmail` riêng.
