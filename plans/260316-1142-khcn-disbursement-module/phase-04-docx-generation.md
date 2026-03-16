# Phase 4: DOCX Generation Integration

## Priority: P1 | Status: pending | Effort: 1h

## Overview

Wire up DOCX generation for KHCN disbursement templates. Most infrastructure exists — this phase ensures template files work with the data dict and handles UNC multi-beneficiary zip logic.

## Key Insights

- `generateKhcnReport()` in `khcn-report.service.ts` handles generic DOCX generation
- KHDN's UNC logic (multi-beneficiary → zip) in `disbursement-report.service.ts` needs to be ported for KHCN UNC template
- `docxEngine.generateDocxBuffer()` handles placeholder replacement
- Template files already exist in `report_assets/KHCN templates/Chứng từ giải ngân/`

## Implementation Steps

### 1. Create `generateKhcnDisbursementReport()` in khcn-report.service.ts

```ts
export async function generateKhcnDisbursementReport(
  customerId: string,
  templateKey: KhcnDisbursementTemplateKey,
  loanId?: string,
  disbursementId?: string,
  overrides?: Record<string, string>,
): Promise<KhcnReportResult> {
  const template = KHCN_DISBURSEMENT_TEMPLATES[templateKey];
  const data = await buildKhcnReportData(customerId, loanId, overrides);

  // UNC multi-beneficiary → zip (same logic as KHDN)
  if (templateKey === "unc" || templateKey === "unc_a4") {
    // Port UNC zip logic from disbursement-report.service.ts
  }

  // Standard single-file generation
  const buffer = await docxEngine.generateDocxBuffer(template.path, data);
  // ... return result
}
```

### 2. Verify template placeholders

Open each .docx template, extract placeholders, verify all are covered by `buildKhcnReportData()`.

### 3. Test end-to-end

- Create a test disbursement for a KHCN customer
- Generate each of the 5 templates
- Verify placeholder replacement

## Related Code Files

- Modify: `src/services/khcn-report.service.ts`

## Todo

- [ ] Add `generateKhcnDisbursementReport()` function
- [ ] Port UNC multi-beneficiary zip logic
- [ ] Verify template placeholder coverage
- [ ] End-to-end test
- [ ] Compile check

## Success Criteria

- All 5 templates generate correctly with GN.* data
- UNC multi-beneficiary produces zip file
- Missing placeholders logged as warnings (not errors)
