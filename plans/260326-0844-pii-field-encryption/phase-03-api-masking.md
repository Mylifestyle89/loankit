# Phase 3: API Masking + Reveal Toggle

**Priority:** High | **Effort:** M | **Status:** Pending | **Blocked by:** Phase 2

## Overview

API returns masked PII by default. `?reveal=cif,phone,cccd` query param returns raw decrypted values (auth required).

## Context Links

- `src/app/api/customers/[id]/route.ts`

## Architecture

```
GET /api/customers/[id]              → masked: { customer_code: "****1234", phone: "091****678" }
GET /api/customers/[id]?reveal=all   → raw:    { customer_code: "5400-1234", phone: "0912345678" }
GET /api/customers/[id]?full=true    → masked profile + summary
```

## Implementation Steps

### Step 1: Mask utility for API responses

```typescript
// In field-encryption.ts, add:
export function maskCustomerResponse<T extends Record<string, unknown>>(
  customer: T,
  revealFields?: Set<string>,
): T {
  const result = { ...customer };
  const maskMap: Record<string, 'cif' | 'phone' | 'cccd'> = {
    customer_code: 'cif',
    phone: 'phone',
    cccd: 'cccd',
    spouse_cccd: 'cccd',
  };
  for (const [field, type] of Object.entries(maskMap)) {
    if (revealFields?.has(field) || revealFields?.has('all')) continue;
    const val = result[field];
    if (typeof val === 'string' && val) {
      (result as Record<string, unknown>)[field] = maskPiiField(val, type);
    }
  }
  return result;
}
```

### Step 2: Modify GET /api/customers/[id]/route.ts

```typescript
// Parse reveal param
const revealParam = req.nextUrl.searchParams.get("reveal");
const revealFields = revealParam ? new Set(revealParam.split(",")) : undefined;

// After fetching customer (already decrypted by service):
const masked = maskCustomerResponse(customer, revealFields);
return NextResponse.json({ ok: true, customer: masked });
```

### Step 3: List endpoint masking

`GET /api/customers` (if exists) → mask all items in list. No reveal param for list.

## Security

- `?reveal=all` requires authenticated session (already enforced by proxy.ts)
- Consider: log reveal requests for audit trail (future enhancement)

## Todo

- [ ] Add `maskCustomerResponse` to field-encryption.ts
- [ ] Modify GET /api/customers/[id] to mask by default
- [ ] Support `?reveal=all` and `?reveal=cif,phone` params
- [ ] Mask in full profile response too
- [ ] Mask in list endpoint
- [ ] Compile check

## Success Criteria

- [ ] `GET /api/customers/123` returns masked CIF/phone/CCCD
- [ ] `GET /api/customers/123?reveal=all` returns raw values
- [ ] `GET /api/customers/123?full=true` returns masked profile
