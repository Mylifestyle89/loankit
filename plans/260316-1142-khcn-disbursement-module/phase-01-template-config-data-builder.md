# Phase 1: Template Config + Data Builder

## Priority: P1 | Status: pending | Effort: 1.5h

## Overview

Create KHCN disbursement template config (like `disbursement-report-template-config.ts` for KHDN) and ensure data builder emits all GN.* placeholders needed by the 4 templates.

## Key Insights

- Templates already exist in `report_assets/KHCN templates/Chứng từ giải ngân/` — 4 files: UNC, 599 UNC A4, HĐ cung ứng vật tư, BB giao nhận
- 2268.07 BCĐXGN is in `Hợp đồng tín dụng/` folder (category: hop_dong)
- GN.* placeholders already registered in `khcn-placeholder-registry.ts`
- `buildDisbursementExtendedData()` in `khcn-report-data-builders.ts` already builds GN.* data from a Disbursement record
- `buildBeneficiaryLoopData()` already builds UNC loop data

## Implementation Steps

### 1. Create `src/services/khcn-disbursement-template-config.ts`

```ts
export const KHCN_DISBURSEMENT_TEMPLATES = {
  bcdxgn: {
    label: "BCĐXGN kiểm GNN hạn mức SXKD",
    path: "report_assets/KHCN templates/Hợp đồng tín dụng/2268.07 BCDXGN kiem GNN han muc SXKD.docx",
  },
  unc: {
    label: "In UNC",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/in UNC.docx",
  },
  unc_a4: {
    label: "Ủy nhiệm chi A4 (599)",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/599 Uy nhiem chi A4.docx",
  },
  hd_cung_ung: {
    label: "HĐ cung ứng vật tư",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/Hop dong cung ung vat tu.docx",
  },
  bb_giao_nhan: {
    label: "BB giao nhận hàng hóa",
    path: "report_assets/KHCN templates/Chứng từ giải ngân/Bien ban giao nhan hang hoa.docx",
  },
} as const;

export type KhcnDisbursementTemplateKey = keyof typeof KHCN_DISBURSEMENT_TEMPLATES;
```

### 2. Verify GN.* data completeness

Check that `buildDisbursementExtendedData()` covers all GN.* fields used in the 4 templates. Cross-reference with `khcn-placeholder-registry.ts`:
- GN.Dư nợ hiện tại, GN.Số tiền nhận nợ, GN.STNN bằng chữ, GN.Mục đích
- GN.Tổng dư nợ, GN.DNHT bằng chữ, GN.TDN bằng chữ
- GN.Tài liệu chứng minh, GN.Tiền mặt

Add any missing fields to `buildDisbursementExtendedData()`.

### 3. Add `GN.Tiền mặt` field

Currently missing from builder. Add to `buildDisbursementExtendedData()`:
```ts
data["GN.Tiền mặt"] = d.cashAmount ?? "";
```
If DB field doesn't exist, support via overrides.

## Related Code Files

- Modify: `src/services/khcn-report-data-builders.ts`
- Create: `src/services/khcn-disbursement-template-config.ts`

## Todo

- [ ] Create template config file
- [ ] Verify GN.* placeholder coverage against actual template DOCX files
- [ ] Add missing GN fields to builder
- [ ] Compile check

## Success Criteria

- Template config maps all 5 KHCN disbursement templates
- Data builder emits all GN.* fields needed by templates
