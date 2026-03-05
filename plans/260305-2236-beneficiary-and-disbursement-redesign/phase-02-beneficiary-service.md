# Phase 2: Beneficiary Service + Excel Import

**Priority:** High | **Status:** Pending | **Effort:** M

## Service: `src/services/beneficiary.service.ts`

### CRUD Operations
```typescript
export type CreateBeneficiaryInput = {
  loanId: string;
  name: string;
  accountNumber?: string;
  bankName?: string;
};

export type UpdateBeneficiaryInput = {
  name?: string;
  accountNumber?: string;
  bankName?: string;
};

// Methods: list(loanId), getById(id), create(input), update(id, input), delete(id)
// bulkCreate(loanId, items[]) - for Excel import
```

### Excel Import
- Accept `.xlsx` file upload
- Parse with existing `xlsx` dependency (already in project for `xlsx-table-injector.ts`)
- Expected headers: `Đơn vị thụ hưởng | Số tài khoản | Ngân hàng thụ hưởng`
- Fuzzy header matching (trim, lowercase compare)
- Return: `{ created: number, errors: string[] }`

## API Routes

### `src/app/api/loans/[id]/beneficiaries/route.ts`
- `GET` — list beneficiaries for loan
- `POST` — create single beneficiary

### `src/app/api/loans/[id]/beneficiaries/import/route.ts`
- `POST` (multipart) — Excel file upload, bulk create

### `src/app/api/beneficiaries/[id]/route.ts`
- `PATCH` — update
- `DELETE` — delete

## Related Files
- `src/services/beneficiary.service.ts` (new)
- `src/app/api/loans/[id]/beneficiaries/route.ts` (new)
- `src/app/api/loans/[id]/beneficiaries/import/route.ts` (new)
- `src/app/api/beneficiaries/[id]/route.ts` (new)

## Success Criteria
- [ ] CRUD API works via curl
- [ ] Excel import parses 3-column format correctly
- [ ] Duplicate handling (skip or warn)
