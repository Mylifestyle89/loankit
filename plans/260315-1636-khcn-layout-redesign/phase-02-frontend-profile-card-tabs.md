# Phase 2: Frontend - KHCN Profile Card + Conditional Tabs

## Overview
- **Priority:** High
- **Status:** pending
- **Effort:** 2.5h

## Context
- `page.tsx` (382 lines) uses `allTabs` array and renders `CustomerSummaryCards` unconditionally
- Customer type available via `form.customer_type` or `customer.customer_type`
- Info tab already has subtabs pattern we can reuse for merged "Khoan vay & Tin dung" tab

## Architecture

### Conditional rendering by customer_type:
```
if individual:
  <KhcnProfileCard />     // replaces CustomerSummaryCards
  khcnTabs (5 tabs)        // replaces allTabs (6 tabs)
else:
  <CustomerSummaryCards />  // unchanged
  allTabs (6 tabs)          // unchanged
```

### KHCN Tab Structure:
```
Tab 1: "Noi cho vay" (key: "branch")     — same as before
Tab 2: "Thong tin" (key: "info")          — same content, just renamed label
Tab 3: "Khoan vay & Tin dung" (key: "loans-credit") — merged, with subtabs
Tab 4: "TSBD" (key: "collateral")        — same as before
Tab 5: "In mau bieu" (key: "templates")  — same as before
```

## Related Code Files

### Create
- `src/app/report/customers/[id]/components/khcn-profile-card.tsx` (~80 lines)

### Modify
- `src/app/report/customers/[id]/page.tsx` — conditional tabs + profile card swap

## Implementation Steps

### 1. Create `khcn-profile-card.tsx`

Props:
```ts
type KhcnProfileCardProps = {
  customer: {
    customer_name: string;
    customer_code: string;
    cccd: string | null;
    phone: string | null;
    address: string | null;
  };
  summary: {
    totalLoans: number;
    activeLoans: number;
    outstandingBalance: number;
    debtGroup: string | null;
    nearestMaturity: string | null;
    coBorrowerCount: number;
  };
};
```

Layout — single card, 3 rows:
- **Row 1:** Name | CIF: `customer_code` | CCCD: `cccd` | SĐT: `phone`
- **Row 2:** Address (full width, text-sm muted)
- **Row 3:** Grid of stat badges:
  - Khoan vay: `activeLoans`/`totalLoans`
  - Du no: `outstandingBalance` (formatted VND)
  - Nhom no: `debtGroup` (color-coded: 1=green, 2=yellow, 3-5=red)
  - Han dao: `nearestMaturity` (formatted date, red if < 30 days)
  - Dong vay: Co/Khong based on `coBorrowerCount > 0`

Style: Match existing card style (`rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm`).

### 2. Modify `page.tsx`

#### a. Add KHCN tabs constant
```ts
const khcnTabs = [
  { key: "branch", label: "Noi cho vay" },
  { key: "info", label: "Thong tin" },
  { key: "loans-credit", label: "Khoan vay & Tin dung" },
  { key: "collateral", label: "TSBD" },
  { key: "templates", label: "In mau bieu" },
] as const;
```

#### b. Derive tabs based on customer_type
```ts
const isIndividual = customer?.customer_type === "individual";
const tabs = isIndividual ? khcnTabs : allTabs;
```

#### c. Conditional summary/profile card
Replace line 203:
```tsx
{customer?.summary && (
  isIndividual
    ? <KhcnProfileCard customer={customer} summary={customer.summary} />
    : <CustomerSummaryCards summary={customer.summary} />
)}
```

#### d. Tab bar: render `tabs` instead of `allTabs`

#### e. Add merged tab content for "loans-credit"
```tsx
{activeTab === "loans-credit" && customer && (
  <div className="space-y-4">
    {/* Subtabs */}
    <div className="flex gap-1">
      {[
        { key: "loans", label: "Khoan vay" },
        { key: "credit", label: "Thong tin tin dung" },
      ].map(st => (...))}
    </div>
    {loansCreditSubTab === "loans" && <CustomerLoansSection ... />}
    {loansCreditSubTab === "credit" && <CustomerCreditInfoSection ... />}
  </div>
)}
```

#### f. Add state for new subtab
```ts
const [loansCreditSubTab, setLoansCreditSubTab] = useState<"loans" | "credit">("loans");
```

#### g. TabKey type needs union of both tab sets
Use `string` for `activeTab` state, or create union type from both arrays.

### 3. Handle tab URL param compatibility
`initialTab` should map old tab keys to new ones for KHCN:
- "credit" -> set activeTab="loans-credit", loansCreditSubTab="credit"
- "loans" -> set activeTab="loans-credit", loansCreditSubTab="loans"

## Todo
- [ ] Create `khcn-profile-card.tsx` with 3-row layout
- [ ] Add `khcnTabs` constant to page.tsx
- [ ] Conditional profile card vs summary cards
- [ ] Conditional tab rendering
- [ ] Add "loans-credit" merged tab with subtabs
- [ ] Add `loansCreditSubTab` state
- [ ] Handle URL param backward compat for tab keys
- [ ] Rename "Nguoi vay" label to "Thong tin" for KHCN
- [ ] Verify DN layout completely unchanged
- [ ] Check page.tsx stays under 200 lines (may need to extract tab bar)

## Risk Assessment
- **page.tsx size:** Currently 382 lines — already over limit. Adding conditional logic will increase it. Consider extracting tab bar into `customer-tab-bar.tsx` if needed.
- **Type safety:** Union of two tab key sets needs careful typing. Simplest: use `string` for activeTab state.

## Success Criteria
- KHCN customer shows compact profile card instead of 8 cards
- KHCN customer shows 5 tabs with merged loans+credit tab
- DN customer page renders identically to current (no visual diff)
- No TypeScript compile errors
- URL param `?tab=credit` still works for KHCN (maps to merged tab)
