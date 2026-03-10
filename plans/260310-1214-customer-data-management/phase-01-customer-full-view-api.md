# Phase 1: Customer Full-View API & Service

## Priority: HIGH | Status: pending

## Overview

Tạo API endpoint trả về toàn bộ dữ liệu của 1 khách hàng, bao gồm tất cả relations: loans, disbursements, invoices, beneficiaries, mapping instances.

## Key Insights

- Prisma hỗ trợ nested include — 1 query lấy toàn bộ relation tree
- Customer → Loans → Disbursements → Invoices/DisbursementBeneficiaries
- Customer → MappingInstances → FieldTemplateMaster
- Cần tính toán summary stats (tổng giải ngân, tổng hoá đơn, etc.)

## Related Code Files

### Modify
- `src/services/customer.service.ts` — Thêm method `getFullProfile(id)`
- `src/app/api/customers/[id]/route.ts` — Thêm query param `?full=true`

### Reference
- `prisma/schema.prisma` — Schema relationships
- `src/services/loan.service.ts` — Loan query patterns
- `src/services/disbursement.service.ts` — Disbursement patterns
- `src/services/invoice.service.ts` — Invoice patterns

## Implementation Steps

### Step 1: Add `getFullProfile()` to customer.service.ts

```typescript
// Fetch customer with ALL relations nested
async getFullProfile(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      loans: {
        include: {
          disbursements: {
            include: {
              invoices: true,
              disbursementBeneficiaries: {
                include: { invoices: true }
              }
            }
          },
          beneficiaries: true
        }
      },
      mapping_instances: {
        include: { master: true }
      }
    }
  });
}
```

### Step 2: Add summary computation

```typescript
// Compute summary stats from full profile
function computeCustomerSummary(customer) {
  return {
    totalLoans: customer.loans.length,
    totalDisbursements: sum of all loan disbursements,
    totalInvoices: sum of all invoices,
    totalLoanAmount: sum of loan amounts,
    totalDisbursedAmount: sum of disbursement amounts,
    totalInvoiceAmount: sum of invoice amounts,
    activeLoans: count where status === 'active',
    overdueInvoices: count where status === 'overdue'
  };
}
```

### Step 3: Update GET `/api/customers/[id]`

- Add query param `?full=true`
- If full=true → call `getFullProfile()` + compute summary
- If full=false → existing behavior (basic fields only)

## Success Criteria

- [ ] `GET /api/customers/:id?full=true` returns complete nested data
- [ ] Summary stats computed correctly
- [ ] Response time < 500ms for typical customer (< 50 loans)
- [ ] Existing `GET /api/customers/:id` still works unchanged

## Risk Assessment

- **Large dataset**: Customer with many loans → large response. Mitigate: Prisma query is efficient with nested includes.
- **N+1 queries**: Prisma handles this with include (single SQL query per level).
