## Phase 3: Customer UI Update

**Priority:** P2 | **Status:** done | **Effort:** 4h | **Depends:** Phase 2

### Context
- List page: `src/app/report/customers/page.tsx`
- Detail page: `src/app/report/customers/[id]/page.tsx`
- New page: `src/app/report/customers/new/page.tsx`

### Requirements
- Tab filter on list: "Tất cả | DN | Cá nhân"
- Customer card show type badge
- Detail page: conditional render by type
- New customer form: type selector, conditional fields

### Implementation Steps

1. **List page — tab filter**
   - Add state `activeTab: "all" | "corporate" | "individual"`
   - 3 tab buttons above customer cards
   - Fetch with `?type=` param when tab != "all"
   - Badge on each card: "DN" (blue) / "Cá nhân" (green)

2. **New customer page — type selector**
   - Radio/toggle at top: "Doanh nghiệp" | "Cá nhân"
   - Corporate: existing fields (charter_capital, organization_type, legal_rep)
   - Individual: cccd, date_of_birth, phone, address
   - Shared: customer_name, customer_code, email, address

3. **Detail page — conditional sections**
   - Show type-appropriate fields
   - Individual: show CCCD, DOB, Phone prominently
   - Hide corporate-only fields (charter_capital, org_type) for individuals
   - Add "Phương án vay" section link (Phase 7)

4. **Quick stats update**
   - Show count per type in header stats

### Related Files
- `src/app/report/customers/page.tsx` (modify)
- `src/app/report/customers/[id]/page.tsx` (modify)
- `src/app/report/customers/new/page.tsx` (modify)
- `src/app/report/customers/[id]/components/` (modify as needed)

### Success Criteria
- Tab filter works, URL stays clean
- Type badge visible on all customer cards
- Form adapts to selected type
- No regression for existing corporate customers
