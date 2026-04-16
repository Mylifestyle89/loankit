# Phase 1: Encrypt `_owners` PII (P0 Compliance)

## Priority: P0 CRITICAL | Effort: M | Status: pending

## Context

`Collateral.properties_json._owners[]` chứa PII plaintext (cccd, phone, address). Agribank security scan quét DB sẽ flag. Xem [collateral contract §4.2.1](../../docs/contracts/collateral.contract.md).

## Approach: Option B — Encrypt `_owners` JSON string

Encrypt toàn bộ `_owners` array thành 1 encrypted string trước khi save vào `properties_json`. Decrypt khi load.

## Files to modify

| File | Change |
|---|---|
| `src/lib/field-encryption.ts` | Add `encryptCollateralOwners()`, `decryptCollateralOwners()` |
| `src/services/customer.service.ts` | Call encrypt trước save collateral, decrypt sau load |
| `src/services/khcn-builder-collateral-land.ts` | Ensure builder reads decrypted `_owners` |
| `src/services/khcn-builder-collateral-movable.ts` | Same |
| `src/services/khcn-report-data-loader.ts` | Decrypt `_owners` trong collateral after DB load |

## Implementation

```ts
// field-encryption.ts
export function encryptCollateralOwners(props: Record<string, unknown>): Record<string, unknown> {
  const result = { ...props };
  if (Array.isArray(result._owners) && result._owners.length > 0) {
    result._owners = encryptField(JSON.stringify(result._owners));
  }
  return result;
}

export function decryptCollateralOwners(props: Record<string, unknown>): Record<string, unknown> {
  const result = { ...props };
  if (typeof result._owners === "string" && isEncrypted(result._owners)) {
    try {
      result._owners = JSON.parse(decryptField(result._owners));
    } catch { result._owners = []; }
  }
  return result;
}
```

## Migration for existing data

Existing collaterals có `_owners` plaintext array. Cần 1-time migration script:
1. Load tất cả collaterals
2. Parse `properties_json`
3. Encrypt `_owners` array
4. Update `properties_json` column

## Success Criteria

- `_owners` PII encrypted trong DB — grep DB dump không thấy CCCD plaintext
- Builders vẫn render đúng owner info (decrypt trước build)
- Existing collaterals migrate OK
- Remove `⚠️ NOT YET IMPLEMENTED` khỏi collateral contract §4.2.1
