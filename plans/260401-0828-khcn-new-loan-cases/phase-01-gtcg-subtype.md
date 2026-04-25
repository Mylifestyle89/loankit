# Phase 1: GTCG Subtype for tiet_kiem Collateral

## Overview
- **Priority**: P2
- **Status**: pending
- **Est**: 3h

Extend `tiet_kiem` collateral type to support "Giay to co gia" (GTCG) as a subtype. No DB migration needed -- subtype stored in existing `properties_json`.

## Key Insights
- `tiet_kiem` form is currently a flat grid (no sections like qsd_dat/dong_san)
- Data builder `buildSavingsCollateralData` emits TK.* prefix fields
- GTCG shares some fields with tiet_kiem (serial, issuer, balance, maturity_date) but adds: paper_type, face_value
- Subtype default = `the_tiet_kiem` for backward compat (empty subtype = the_tiet_kiem)

## Related Code Files

### Modify
1. `src/app/report/customers/[id]/components/collateral-config.ts`
   - Update `COLLATERAL_TYPES` label: "The tiet kiem" -> "The tiet kiem / GTCG"
   - Add GTCG-specific property keys to `PROPERTY_LABELS`
   - Add `FORM_FIELDS.tiet_kiem` entries for GTCG subtype fields
   - Add new keys to `NUMBER_KEYS`, `DATE_KEYS` as needed

2. `src/app/report/customers/[id]/components/collateral-form.tsx`
   - Add subtype selector (radio/select) when `type === "tiet_kiem"`:
     - "The tiet kiem" (default)
     - "Giay to co gia" (GTCG)
   - Conditionally show different field groups based on subtype
   - Store subtype in `properties._subtype`

3. `src/services/khcn-builder-collateral-savings-other.ts`
   - `extractSavingsFields()`: check `_subtype` to emit correct fields
   - For GTCG: emit paper_type, face_value, issuer, maturity_date to TK.* prefix
   - Keep backward compat: no subtype = emit existing fields

4. `src/app/report/customers/[id]/components/collateral-display.tsx`
   - Show subtype label in display view

### No Changes
- `prisma/schema.prisma` -- no migration needed
- API routes -- properties_json already accepts arbitrary keys

## Implementation Steps

### Step 1: Config updates (`collateral-config.ts`)
1. Change COLLATERAL_TYPES tiet_kiem label to "The tiet kiem / GTCG"
2. Add new property labels:
   ```
   _subtype: "Phan loai"
   paper_type: "Loai giay to co gia"
   face_value: "Menh gia"
   ```
3. Add `face_value` to `NUMBER_KEYS`
4. Create separate field lists:
   ```ts
   export const TK_SAVINGS_KEYS = ["serial", "issuer", "term", "balance", "interest_rate", "issue_date", "maturity_date", "max_loan"];
   export const TK_GTCG_KEYS = ["serial", "paper_type", "issuer", "face_value", "balance", "interest_rate", "issue_date", "maturity_date", "max_loan"];
   ```

### Step 2: Form UI (`collateral-form.tsx`)
1. Add state: `const [tkSubtype, setTkSubtype] = useState(initial?.properties?._subtype ?? "the_tiet_kiem")`
2. When `type === "tiet_kiem"`, render subtype selector before fields
3. Filter visible fields based on subtype using TK_SAVINGS_KEYS / TK_GTCG_KEYS
4. Persist `_subtype` in props on save
5. Reset subtype when collateral type changes

### Step 3: Data builder (`khcn-builder-collateral-savings-other.ts`)
1. In `extractSavingsFields()`, read `p._subtype`
2. If `_subtype === "giay_to_co_gia"`:
   - Emit: `"Loai GTCG": p.paper_type`, `"Menh gia": fmtN(p.face_value)`
   - Keep shared fields: serial, issuer, balance, interest_rate, dates
3. Default (no subtype or "the_tiet_kiem"): existing behavior unchanged

### Step 4: Display update (`collateral-display.tsx`)
1. When rendering tiet_kiem items, show subtype label if `_subtype === "giay_to_co_gia"`

## Todo List
- [ ] Update collateral-config.ts: label, property labels, field keys, number keys
- [ ] Add subtype selector to collateral-form.tsx
- [ ] Conditional field rendering by subtype
- [ ] Update extractSavingsFields() in builder
- [ ] Update collateral-display.tsx
- [ ] Manual test: create GTCG collateral, verify form saves, verify DOCX data output

## Success Criteria
- Can create tiet_kiem collateral with subtype "GTCG" via UI
- Existing tiet_kiem collaterals unchanged (backward compat)
- Data builder emits correct TK.* fields for both subtypes
- No DB migration required

## Risk Assessment
- **Low**: Existing tiet_kiem data has no `_subtype` -> defaults to the_tiet_kiem behavior
- **Medium**: DOCX templates for GTCG may need new placeholders (depends on Phase 3)
