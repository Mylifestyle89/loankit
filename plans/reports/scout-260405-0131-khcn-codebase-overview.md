# Scout Report: KHCN Codebase Overview

**Date:** 2026-04-05 | **Scope:** All KHCN-related files in main codebase (excluding worktrees)

## Architecture Summary

KHCN (Khách Hàng Cá Nhân) module = hệ thống tạo báo cáo DOCX cho khách hàng cá nhân vay vốn Agribank.

**Data Flow:**
```
Customer (Prisma) → loadFullCustomer → buildKhcnReportData (orchestrator)
  → 12+ specialized builders → flat placeholder dict
  → docxEngine.generateDocxBuffer → DOCX file download
```

---

## Relevant Files (~40 files, ~4,800 LOC)

### Services Layer (~2,300 LOC)

| File | Lines | Purpose |
|------|-------|---------|
| `src/services/khcn-report.service.ts` | 93 | Entry point: generateKhcnReport, generateKhcnDisbursementReport |
| `src/services/khcn-report-data-builder.ts` | 272 | Central orchestrator, delegates to specialized builders |
| `src/services/khcn-report-data-builders.ts` | 14 | Re-export hub (backward compat) |
| `src/services/khcn-report-data-loader.ts` | 44 | Prisma query + PII decrypt |
| `src/services/khcn-report-helpers.ts` | 124 | HĐ cũ sync, UNC flatten, bảng kê |
| `src/services/khcn-builder-loan-plan.ts` | 292 | Phương án vay: cost/revenue/depreciation |
| `src/services/khcn-builder-credit.ts` | 128 | Dư nợ Agribank + TCTD khác |
| `src/services/khcn-builder-customer-branch.ts` | 72 | CMND/CCCD, chi nhánh, cán bộ |
| `src/services/khcn-builder-persons.ts` | 96 | Đồng trả nợ + người liên quan |
| `src/services/khcn-builder-documents-pa.ts` | 56 | Tài liệu phương án (TLPA loop) |
| `src/services/khcn-builder-collateral-land.ts` | 287 | TSBĐ đất: sổ đỏ, định giá |
| `src/services/khcn-builder-collateral-movable.ts` | 94 | TSBĐ động sản: xe, máy móc |
| `src/services/khcn-builder-collateral-savings-other.ts` | 159 | TSBĐ tiết kiệm + tài sản khác |
| `src/services/khcn-builder-collateral-helpers.ts` | 109 | Shared: owners, indexed fields |
| `src/services/khcn-builder-loan-disbursement.ts` | 181 | HĐTD + giải ngân + UNC |
| `src/services/khcn-disbursement-template-config.ts` | 30 | Registry disbursement templates |
| `src/services/disbursement-report.service.ts` | 296 | Standalone disbursement generator |
| `src/services/__tests__/khcn-report-data-builders.test.ts` | 262 | Unit tests collateral builders |

### Lib Layer (~875 LOC)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/report/khcn-placeholder-registry.ts` | 285 | ~20 nhóm placeholder cho UI reference |
| `src/lib/report/khcn-template-validator.ts` | 170 | 3-layer validation (registry→placeholder→DOCX) |
| `src/lib/report/khcn-docx-tag-scanner.ts` | 107 | Quét DOCX trích xuất [tag] |
| `src/lib/loan-plan/khcn-template-registry.ts` | 102 | Registry chính: template × phương thức vay |
| `src/lib/loan-plan/khcn-camco-template-registry.ts` | 45 | Templates cầm cố thẻ tiết kiệm |
| `src/lib/loan-plan/khcn-asset-template-registry.ts` | 112 | ~95 templates TSBĐ theo loại thế chấp |
| `src/lib/field-visibility/field-visibility-config.ts` | 55 | Field show/hide theo điều kiện KHCN/KHDN |

### UI Layer (~1,600 LOC)

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/report/khcn/page.tsx` | 12 | Redirect → /khcn/customers |
| `src/app/report/khcn/layout.tsx` | 7 | Passthrough layout |
| `src/app/report/khcn/customers/page.tsx` | 6 | Customer list wrapper |
| `src/app/report/khcn/customers/new/page.tsx` | 6 | New customer form wrapper |
| `src/app/report/khcn/customers/[id]/page.tsx` | 6 | Customer detail wrapper |
| `src/app/report/customers/[id]/page.tsx` | 38 | Redirect old URL → KHCN/KHDN |
| `src/app/report/customers/[id]/components/khcn-doc-checklist.tsx` | 327 | Template checklist + DOCX generate |
| `src/app/report/customers/[id]/components/khcn-placeholder-panel.tsx` | 165 | Placeholder reference + search/copy |
| `src/app/report/customers/[id]/components/khcn-profile-card.tsx` | 113 | Customer summary card |
| `src/components/invoice-tracking/khcn-disbursement-report-modal.tsx` | 97 | Modal tạo báo cáo giải ngân |
| `src/components/invoice-tracking/loan-edit-modal.tsx` | 290 | Modal sửa khoản vay (4 tabs) |
| `src/components/loan-plan/xlsx-sample-dropdown.tsx` | 88 | Download XLSX mẫu phương án |
| `src/components/customers/customer-list-view.tsx` | 266 | Danh sách KH: search, sort, import/export |
| `src/components/customers/customer-detail-view.tsx` | 356 | Chi tiết KH: tabs info/loans/TSBĐ/templates |

### API Routes (~210 LOC)

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/api/report/templates/khcn/route.ts` | 29 | GET templates by loan method |
| `src/app/api/report/templates/khcn/generate/route.ts` | 57 | POST generate DOCX |
| `src/app/api/report/templates/khcn/disbursement/route.ts` | 67 | POST generate disbursement DOCX |
| `src/app/api/report/templates/khcn/xlsx-samples/route.ts` | 57 | GET list/download XLSX samples |

### Scripts (~245 LOC)

| File | Lines | Purpose |
|------|-------|---------|
| `scripts/validate-khcn-templates.ts` | 63 | CLI validate registry vs DOCX |
| `scripts/scan-khcn-template-placeholder-fixes.js` | 181 | Scan DOCX cho placeholder cũ, xuất CSV |

---

## Key Patterns

1. **Builder pattern**: Mỗi domain concern (collateral, credit, persons...) = 1 builder file riêng
2. **Dual placeholder**: Flat (`SĐ.Địa chỉ`) + indexed (`SĐ_1.Địa chỉ`) cho flexibility
3. **Loop arrays**: `[#TSBD]...[/TSBD]`, `[#UNC]...[/UNC]` cho repeating sections
4. **3-layer validation**: Template registry → Placeholder registry → DOCX tag scan
5. **PII encryption**: loadFullCustomer decrypt AES-256-GCM fields
6. **Security**: Disbursement service whitelists override keys per template

## Unresolved Questions

- `noClone` flag trong KhcnDocTemplate — exact behavior?
- Worktrees (`agent-a5e1ab78`, `modest-ellis`) có changes chưa merge về main?
