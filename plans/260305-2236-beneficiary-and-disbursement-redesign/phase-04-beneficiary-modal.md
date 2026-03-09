# Phase 4: Beneficiary Modal (P1)

**Priority:** High | **Status:** Pending | **Effort:** M

## UI Design

### Button placement
In loan detail card (alongside Edit button):
```
[Chỉnh sửa] [Đơn vị thụ hưởng]
```

### Modal: `BeneficiaryModal`
Location: `src/components/invoice-tracking/beneficiary-modal.tsx`

**Layout:**
```
┌─────────────────────────────────────────┐
│ Đơn vị thụ hưởng - [Contract#]    [X]  │
├─────────────────────────────────────────┤
│ [+ Thêm mới]  [📥 Import Excel]        │
├─────────────────────────────────────────┤
│ Đơn vị thụ hưởng │ Số TK │ Ngân hàng │ │
│ Cty ABC           │ 123.. │ VCB       │🗑│
│ Cty XYZ           │ 456.. │ BIDV      │🗑│
│ (inline add row)  │       │           │ │
├─────────────────────────────────────────┤
│                        [Hủy] [Lưu]     │
└─────────────────────────────────────────┘
```

### Features
1. **Table view**: editable inline rows (name, accountNumber, bankName)
2. **Add row**: empty row appears at bottom for inline entry
3. **Delete**: trash icon per row, confirm before delete if has linked disbursements
4. **Excel import**: file input → parse → preview → confirm → bulk create
5. **Search**: filter existing rows by name (for large lists)

### Excel Import Flow
1. User clicks "Import Excel"
2. File picker opens (accept .xlsx, .xls)
3. Parse file, show preview table
4. User confirms → POST /api/loans/{id}/beneficiaries/import
5. Refresh list

## Related Files
- `src/components/invoice-tracking/beneficiary-modal.tsx` (new)
- `src/app/report/loans/[id]/page.tsx` (modify: add button + state)

## Success Criteria
- [ ] Add/edit/delete beneficiaries inline
- [ ] Excel import with preview
- [ ] Data persists via API
