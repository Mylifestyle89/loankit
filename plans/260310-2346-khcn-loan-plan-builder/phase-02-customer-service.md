## Phase 2: Customer Service Extension

**Priority:** P1 | **Status:** pending | **Effort:** 3h | **Depends:** Phase 1

### Context
- `src/services/customer.service.ts` — existing CRUD + saveFromDraft + toDraft
- `FIELD_TO_COLUMN` / `COLUMN_TO_FIELD` maps need individual fields

### Requirements
- Support `customer_type` in create/update/list
- Add KHCN-specific field mappings (cccd, date_of_birth, phone)
- Filter by type in list endpoint
- `saveFromDraft` detect type from data keys

### Implementation Steps

1. **Extend FIELD_TO_COLUMN / COLUMN_TO_FIELD**
   ```
   "A.general.cccd" -> "cccd"
   "A.general.date_of_birth" -> "date_of_birth"
   "A.general.phone" -> "phone"
   "A.general.customer_type" -> "customer_type"
   ```

2. **Update CreateCustomerInput type**
   - Add: `customer_type?, cccd?, date_of_birth?, phone?`

3. **Update toCreateDbData / toUpdateDbData**
   - Map new fields

4. **Update listCustomers(filter?)**
   ```ts
   async listCustomers(filter?: { customer_type?: string }): Promise<Customer[]> {
     return prisma.customer.findMany({
       where: filter?.customer_type ? { customer_type: filter.customer_type } : undefined,
       orderBy: { updatedAt: "desc" },
     });
   }
   ```

5. **Update saveFromDraft**
   - Detect individual type: if `A.general.cccd` present => set customer_type = "individual"
   - Map cccd, date_of_birth, phone to top-level columns

6. **Update API route** `src/app/api/customers/route.ts`
   - Accept `?type=individual|corporate` query param

### Related Files
- `src/services/customer.service.ts` (modify)
- `src/app/api/customers/route.ts` (modify)

### Success Criteria
- `GET /api/customers?type=individual` returns only KHCN
- Create individual customer with cccd/phone works
- Existing corporate flow unchanged
