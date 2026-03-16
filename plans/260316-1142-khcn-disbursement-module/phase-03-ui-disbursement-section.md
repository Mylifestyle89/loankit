# Phase 3: UI — Disbursement Section

## Priority: P1 | Status: pending | Effort: 2h

## Overview

Add disbursement management to KHCN customer detail page. Two parts:
1. **Disbursement history list** — table showing past disbursements for the active loan
2. **Create/generate disbursement** — form to input GN fields + select template + generate DOCX

## Key Insights

- Customer detail page (`src/app/report/customers/[id]/page.tsx`) uses tabs
- KHCN tabs: branch, info, loans-credit, collateral, templates
- Best placement: **inside "Khoản vay" tab** as a sub-section under the active loan, OR as a new subtab "Giải ngân" in loans-credit
- Pattern follows existing sections like `CustomerCollateralSection`

## Architecture

### Option A (recommended): Subtab in loans-credit
Add "Giải ngân" as 3rd subtab alongside "Khoản vay" and "Thông tin tín dụng":
```
[Khoản vay] [Tín dụng] [Giải ngân]
```

### Component structure
```
customer-disbursement-section.tsx (~150 lines)
├── Disbursement history table (date, amount, purpose, status, actions)
├── "Tạo giải ngân" button → inline form
│   ├── Amount, date, purpose, debtAmount, currentOutstanding
│   └── Beneficiary (optional): name, account, bank, amount
└── Template generate buttons (5 templates from config)
    └── Click → POST /api/report/templates/khcn/disbursement → download DOCX
```

## Implementation Steps

### 1. Create `customer-disbursement-section.tsx`

- Fetch disbursements: `GET /api/loans/[loanId]/disbursements`
- Display as simple table
- "Tạo giải ngân" form with GN.* fields
- Template generate buttons

### 2. Add subtab to customer detail page

In `page.tsx`, add "Giải ngân" to `loansCreditSubTab`:
```ts
const [loansCreditSubTab, setLoansCreditSubTab] = useState<"loans" | "credit" | "disbursement">("loans");
```

### 3. Wire up template generation

Each template button calls the generate endpoint, triggers browser download.

## Related Code Files

- Create: `src/app/report/customers/[id]/components/customer-disbursement-section.tsx`
- Modify: `src/app/report/customers/[id]/page.tsx` (add subtab)

## Todo

- [ ] Create disbursement section component
- [ ] Add subtab to customer detail page
- [ ] Disbursement history table with pagination
- [ ] Create disbursement form (inline)
- [ ] Template generate buttons with download
- [ ] Compile check

## Success Criteria

- Disbursement history visible under "Giải ngân" subtab
- Can create new disbursement with basic fields
- Can generate DOCX for any of the 5 templates
- No invoice tracking UI (KHCN doesn't need it)
