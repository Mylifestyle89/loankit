# Phase 2: Frontend UI Redesign

**Status:** complete
**Priority:** high
**Effort:** 2.5h
**Completed:** 2026-03-15

## Overview

Replaced 8 summary cards with compact profile card and implemented conditional tab layout (5 tabs for KHCN vs 6 for DN). DN customer detail pages remain 100% unchanged.

## Key Insights

- Subtabs pattern (loans + credit merged) reuses established "Khoan vay & Tin dung" pattern from info tab
- Profile card component is lightweight (~100 lines) using Badge for debt group status
- Conditional rendering via `customer_type` check: khcn vs dn layouts diverge only in tab structure
- Badge styling added for uniform loan status display
- Form submission improved with try-catch error handling

## Implementation Summary

### New Component

**src/app/report/customers/[id]/components/khcn-profile-card.tsx** (~100 lines)

Displays:
- Customer name + type badge
- Branch + staff info
- Debt group badge with color coding
- Nearest maturity date
- Co-borrower count
- Outstanding balance / Total contract value

Features:
- Responsive grid layout
- Color-coded debt group badge (success/warning/danger)
- All data from computed summary fields
- DN customers never render this component

### Modified Files

**src/app/report/customers/[id]/page.tsx**

Changes:
- Import khcn-profile-card component
- Conditional render: khcnTabs (5 tabs) if customer_type === 'KHCN', else allTabs (6 tabs)
- Profile card replaces customer-summary-cards for KHCN layout
- Summary cards only render for DN customers
- Tabs structure:
  - KHCN: Thông tin, Khoan vay & Tin dung, Tài sản đảm bảo, Ghi chú, Chứng chỉ
  - DN: Thông tin, Khoan vay, Tin dung, Tài sản đảm bảo, Ghi chú, Chứng chỉ (6 tabs, unchanged)

**src/app/report/customers/[id]/components/customer-loans-section.tsx**

Code review fixes:
- Added badge for tab display (loan count display)
- Improved error handling with try-catch wrapper

**src/app/report/customers/[id]/components/khcn-doc-checklist.tsx**

Code review fixes:
- handleSubmit wrapped in try-catch for form submission errors
- Label text updated: "Dư nợ" → "Tổng vay HĐ" for clarity

## Todo List

- [x] Create khcn-profile-card component with all 6 display fields
- [x] Add conditional tab rendering logic (customer_type check)
- [x] Create khcnTabs array (5 tabs)
- [x] Keep allTabs array unchanged for DN
- [x] Replace summary-cards with profile-card for KHCN
- [x] Add badge styling to loans-credit tab
- [x] Add try-catch to form submissions
- [x] Test KHCN layout with real customer data
- [x] Test DN layout (verify no regression)
- [x] Code review fixes applied

## Success Criteria

✅ KHCN profile shows compact card layout instead of 8 summary cards
✅ KHCN customer has 5 tabs (merged loans + credit)
✅ DN customer shows 6 tabs (unchanged original layout)
✅ All computed fields display correctly on profile card
✅ Debt group badge color-codes properly
✅ Form submissions have error handling
✅ No regression on DN customer pages
✅ Responsive layout on mobile/tablet

## Code Review Fixes Applied

1. Badge for loans-credit merged tab ✅
2. handleSubmit try-catch error handling ✅
3. Label text "Dư nợ" → "Tổng vay HĐ" ✅

## Files Modified

- `src/app/report/customers/[id]/page.tsx`
- `src/app/report/customers/[id]/components/khcn-profile-card.tsx` (NEW)
- `src/app/report/customers/[id]/components/customer-loans-section.tsx`
- `src/app/report/customers/[id]/components/khcn-doc-checklist.tsx`

## Next Steps

Plan complete. All phases delivered and tested. UI-only changes with no architectural impact.
