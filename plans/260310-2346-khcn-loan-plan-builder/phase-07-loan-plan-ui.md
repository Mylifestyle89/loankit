## Phase 7: Loan Plan Builder — UI

**Priority:** P1 | **Status:** done | **Effort:** 6h | **Depends:** Phase 6

### Context
- Customer detail page already exists at `src/app/report/customers/[id]/`
- Need spreadsheet-like form for cost/revenue items
- Han muc vs Vay tung lan = separate UI layouts

### Requirements
- Template picker (grouped by category)
- Editable cost items table (name, unit, qty, price, auto-calc amount)
- Revenue items section (category-specific inputs)
- Live financial summary panel
- Save as draft / mark approved
- Separate layouts for han_muc vs tung_lan

### Page Structure

```
/report/customers/[id]/loan-plans           — list plans for customer
/report/customers/[id]/loan-plans/new       — pick template + create
/report/customers/[id]/loan-plans/[planId]  — edit plan
```

### Components (new, under `src/app/report/customers/[id]/loan-plans/`)

1. **loan-plans-list-page.tsx** — list with status badges, create button
2. **loan-plan-template-picker.tsx** — card grid grouped by category
3. **loan-plan-editor-page.tsx** — main editor layout
4. **cost-items-table.tsx** — editable table, add/remove rows, auto-sum
5. **revenue-items-section.tsx** — category-specific inputs
6. **financial-summary-panel.tsx** — live totals (totalCost, revenue, profit, loanAmount)
7. **loan-plan-header.tsx** — name, type badge, status, save/approve buttons

### UX Details

- Cost items table: inline editing, Tab to next cell, auto-calculate amount=qty*price
- Add row button at bottom, delete icon per row
- Revenue: simpler form (2-4 inputs depending on category)
- Financial summary: sticky sidebar or bottom panel
- Auto-recalculate on every change (debounced 300ms)
- Save: PUT /api/loan-plans/[id] with full JSON
- Han muc layout: add "chu ky quay vong" + "ty le hao hut" fields
- Tung lan layout: standard cost/revenue table

### Design
- Follow existing app design system (violet/fuchsia gradient theme)
- Responsive: table scrolls horizontally on mobile
- Dark mode support

### Success Criteria
- Create plan from template, edit costs, see live calculation
- Save and reload plan maintains all data
- Han muc and tung lan have appropriate distinct layouts
- Works on mobile (basic scroll support)
