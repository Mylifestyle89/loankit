---
phase: 3
title: "Frontend Upload Button + Preview Modal"
status: complete
effort: 2h
completed: 2026-03-15
---

# Phase 3: Frontend Upload + Preview Modal

## Overview
Add XLSX upload button to loan plan page. On upload, call import API, show parsed data in preview modal, let user edit/confirm, then save.

## Existing UI Context
- Loan plan UI lives in `src/app/report/customers/[id]/loan-plans/` (currently empty/not created)
- Customer detail page at `src/app/report/customers/[id]/` has sections for loans, collaterals, etc.
- `src/components/ui/BaseModal.tsx` exists for modals
- Existing pattern: sections use state hooks + fetch calls

## Files to Create/Modify

### `src/lib/hooks/use-xlsx-loan-plan-import.ts` (~60 lines)
Custom hook encapsulating upload logic:
```ts
export function useXlsxLoanPlanImport(customerId: string) {
  const [parseResult, setParseResult] = useState<XlsxParseResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  async function uploadFile(file: File) { ... }
  async function confirmImport(editedData: CreatePlanInput) { ... }
  function resetImport() { ... }

  return { parseResult, isUploading, showPreview, uploadFile, confirmImport, resetImport };
}
```

### `src/components/loan-plan/xlsx-import-button.tsx` (~40 lines)
Simple upload trigger:
- Hidden `<input type="file" accept=".xlsx,.xls">`
- Button styled consistently with existing UI
- Shows spinner during upload
- On file select -> calls `uploadFile` from hook

### `src/components/loan-plan/xlsx-import-preview-modal.tsx` (~150 lines)
Preview modal showing parsed data:
- Header: detected type badge (A/B) + file name
- Warnings list if any
- Editable table of cost items (name, unit, qty, unitPrice, amount)
- Meta fields display (loan amount, interest rate, etc.) — editable
- "Xac nhan" (Confirm) + "Huy" (Cancel) buttons
- On confirm -> calls existing POST /api/loan-plans with assembled CreatePlanInput
- On success -> close modal, refresh loan plan list

Table columns:
| Tên hạng mục | ĐVT | Số lượng | Đơn giá | Thành tiền |

### Modify: Customer loan plan section
Add the import button next to existing "Tao moi" (Create new) button in the loan plans area of customer detail page. Exact file depends on where loan plan list is rendered — likely in `src/app/report/customers/[id]/components/customer-loans-section.tsx` or a dedicated loan plan section.

## Implementation Steps
1. Create hook `use-xlsx-loan-plan-import.ts`
2. Create `xlsx-import-button.tsx`
3. Create `xlsx-import-preview-modal.tsx` with editable cost items table
4. Wire into customer detail page loan plan section
5. Test full flow: upload -> preview -> edit -> confirm -> saved
6. Verify compile

## Success Criteria
- Upload button visible in loan plan section
- Preview modal shows parsed cost items + meta in editable form
- User can adjust values before confirming
- Confirm saves via existing loan plan API
- Error/Type C shows clear message directing to manual input
- Modal follows BaseModal pattern
