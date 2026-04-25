---
phase: 3
title: "Integrate SmartField into All Sections"
status: pending
effort: 1.5h
---

# Phase 3: Integrate SmartField into All Sections

## Context
- Phase 1 provides: enhanced SmartField, DropdownOptionsProvider, batch hook
- Phase 2 provides: prefixed keys, seed data

## Overview
Replace plain `<input>` with `<SmartField>` for all text fields across KHCN customer sections. Wrap each section in `DropdownOptionsProvider` for batch loading.

## Requirements
- Only text fields get SmartField. Number fields (land_area, land_value, etc.) and date fields (mortgage_date, etc.) keep plain input.
- Each section wrapped in `<DropdownOptionsProvider prefix="{section}.">` for batch fetch.
- Main page.tsx: update existing SmartField keys to `customer.` prefix where appropriate.

## Integration Map

### Collateral Section (`customer-collateral-section.tsx`)
**Prefix:** `collateral.`
**Convert to SmartField:** certificate_name, land_purpose, house_structure, house_ownership, ownership_form, house_level, land_origin, house_type, issuing_authority, insurance_status, asset_usage_status, collateral_category, owner_borrower_relationship, advantage_summary
**Keep input:** land_area, land_value, house_value, construction_area, floor_area, floor_number (number); mortgage_date, certificate_issue_date (date); lot_number, map_sheet, registry_number, mortgage_contract (unique identifiers)

### Credit Info Section (`customer-credit-info-section.tsx`)
**Prefix:** `credit_agri.` / `credit_other.`
**Convert:** branch_name, debt_group, loan_purpose, repayment_source, institution_name
**Keep input:** debt_amount, loan_term (number)

### Co-borrower Section (`customer-co-borrower-section.tsx`)
**Prefix:** `co_borrower.`
**Convert:** title, id_type, id_issued_place, relationship
**Keep input:** birth_year, id_issued_date (date); phone (number)
**Note:** Already uses SmartField for some fields - check which ones and update keys

### Related Person Section (`customer-related-person-section.tsx`)
**Prefix:** `related_person.`
**Convert:** relationship, id_type
**Keep input:** none to skip

### Main Customer Page (`page.tsx`)
**Prefix:** `customer.`
**Update existing SmartField keys:** Add `customer.` prefix to: main_business, organization_type, legal_representative_title, customer_code, customer_name, address, legal_representative_name
**Keep as-is or remove SmartField:** cccd, cccd_old, phone (identifiers/numbers), date_of_birth (date), charter_capital (number)

### Branch-Staff Section (`customer-branch-staff-section.tsx`)
**Prefix:** `branch.`
Already uses SmartField. Phase 2 handles key rename. Just wrap in Provider here.

## Implementation Steps

### Per section pattern:
1. Import `DropdownOptionsProvider` and `SmartField`
2. Wrap section JSX in `<DropdownOptionsProvider prefix="{section}.">`
3. Replace target `<input>` elements with `<SmartField fieldKey="{section}.{key}" ...>`
4. Keep number/date inputs as plain `<input>`

### Order:
1. Main page (`page.tsx`) - update existing SmartField keys, wrap in Provider, remove SmartField from number/date fields
2. Branch-staff - wrap in Provider (keys already updated in Phase 2)
3. Collateral section - most fields, highest impact
4. Credit info section
5. Co-borrower section
6. Related person section

## Todo List
- [ ] page.tsx: prefix existing SmartField keys with `customer.`, remove from number/date, wrap in Provider
- [ ] branch-staff: wrap in DropdownOptionsProvider
- [ ] collateral: import SmartField, wrap in Provider, replace ~14 text inputs
- [ ] credit-info: wrap in Provider, replace ~5 text inputs per sub-section
- [ ] co-borrower: update existing SmartField keys with prefix, wrap in Provider
- [ ] related-person: wrap in Provider, replace ~2 text inputs
- [ ] Compile check: `npx next build` or `npx tsc --noEmit`

## Success Criteria
- All text fields across 6 sections use SmartField
- Each section makes only 1 API call (via Provider)
- Number/date fields remain plain inputs
- No compile errors
- Existing data still displays correctly

## Risk
| Risk | Mitigation |
|---|---|
| page.tsx SmartField key change breaks existing dropdown data | Phase 2 migration handles this |
| Collateral section complex (accordion, multiple types) | Only change input→SmartField, don't touch structure |
