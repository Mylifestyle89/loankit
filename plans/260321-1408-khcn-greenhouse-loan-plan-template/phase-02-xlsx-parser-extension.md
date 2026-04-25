# Phase 2: Mo rong XLSX Parser Type A

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1h
- **Depends on:** Phase 1

Parse them cac fields moi tu row 31-46 cua Sheet1 (khau hao, HD thi cong, du no, lai suat uu dai).

## Related Code Files

### Modify
- `src/lib/import/xlsx-loan-plan-types.ts` — them fields moi vao `XlsxParseMeta`
- `src/lib/import/xlsx-loan-plan-parser-type-a.ts` — them META_KEY_MAP entries + parse logic

## Implementation Steps

### 1. Them fields vao XlsxParseMeta (xlsx-loan-plan-types.ts)

```typescript
// Them vao XlsxParseMeta:
depreciationYears?: number;
assetUnitPrice?: number;
landAreaSau?: number;
constructionContractNo?: string;
constructionContractDate?: string;
preferentialRate?: number;
farmAddress?: string;
```

### 2. Mo rong META_KEY_MAP (xlsx-loan-plan-parser-type-a.ts)

Them cac mapping:

```typescript
"Số năm khấu hao": "depreciationYears",
"Đơn giá nhà kính": "assetUnitPrice",
"Số sào đất": "landAreaSau",      // override existing "landArea" if needed
"Số HĐ thi công": "constructionContractNo",
"Ngày HĐ thi công": "constructionContractDate",
"Lãi suất ưu đãi": "preferentialRate",
"Địa chỉ đất NN": "farmAddress",
```

### 3. Handle string fields trong parse loop

Hien tai parser chi xu ly `interestRate` (parseRate), `name`/`counterpartRatio` (String), con lai parseNum. Can them:
- `constructionContractNo`, `constructionContractDate`, `farmAddress` → String
- `preferentialRate` → parseRate

Update switch trong meta extraction:
```typescript
if (metaKey === "interestRate" || metaKey === "preferentialRate") {
  meta[metaKey] = parseRate(val);
} else if (["name","counterpartRatio","constructionContractNo","constructionContractDate","farmAddress"].includes(metaKey)) {
  meta[metaKey] = String(val);
} else {
  meta[metaKey] = parseNum(val);
}
```

### 4. Propagate meta fields vao financials khi save

Khi UI save LoanPlan, cac meta fields nay duoc merge vao `financials_json`. Verify tai page.tsx (Phase 5) rang cac fields duoc truyen dung.

## Todo List
- [ ] Them fields vao XlsxParseMeta
- [ ] Them META_KEY_MAP entries
- [ ] Update parse logic cho string/rate fields
- [ ] Test voi file Excel thuc te
- [ ] Verify compile

## Success Criteria
- Parse file "PA dung nha kinh" tra ve dung cac fields moi trong meta
- Khong break parser hien tai (backward compatible)
