# Phase 4: Block obligation > total_value (P1)

## Priority: P1 | Effort: S | Status: pending

## Context

Nghĩa vụ bảo đảm vượt giá trị tài sản là phi logic nghiệp vụ tín dụng. Hiện chỉ warn ở UI, API/agent có thể bypass. Xem [collateral contract §4.7](../../docs/contracts/collateral.contract.md).

## Files to modify

| File | Change |
|---|---|
| `src/services/customer.service.ts` | Validate trong `handleCollaterals()` trước save |

## Implementation

Trong hàm xử lý collateral create/update:

```ts
if (
  typeof input.obligation === "number" &&
  typeof input.total_value === "number" &&
  input.obligation > input.total_value
) {
  throw new ValidationError(
    `Nghĩa vụ bảo đảm (${input.obligation}) không được vượt tổng giá trị TSBĐ (${input.total_value})`
  );
}
```

## Success Criteria

- POST/PATCH collateral với `obligation > total_value` → 400 error
- Cả 2 null → pass (chưa nhập)
- Chỉ 1 field set → pass (chưa đủ so sánh)
- Remove `⚠️` khỏi collateral contract §4.7 + §8 edge case
