# Phase 2: Report Generation Modal UI

## Status: pending | Priority: High | Effort: L
## Blocked by: Phase 1

## Context
Tạo modal cho phép user chọn template → preview data → generate & download DOCX report từ dữ liệu khoản vay/giải ngân đã populated trong module Khoản vay.

## Architecture

### API Route
`POST /api/loans/[id]/disbursements/[disbursementId]/report`

```typescript
// Request body
{
  templateKey: "bcdx" | "giay_nhan_no" | "danh_muc_ho_so",
  // Optional manual overrides for fields not in DB
  overrides?: Record<string, string>
}

// Response: DOCX file stream (Content-Disposition: attachment)
```

### Service: `disbursement-report.service.ts`

```
buildReportData(disbursementId) → flat data dict
  ├── Load Disbursement (with loan, customer, beneficiaryLines, invoices)
  ├── Map scalar fields (customer, loan, disbursement)
  ├── Map computed fields (number-to-words, date formatting, remaining limit)
  ├── Map loop data (UNC[] for beneficiaries, HD[] for invoices)
  └── Return Record<string, unknown>

generateReport(disbursementId, templateKey, overrides?) → Buffer
  ├── buildReportData()
  ├── Merge overrides
  ├── docxEngine.generateDocx(templatePath, data, outputPath)
  └── Return generated buffer
```

### Template Registry
```typescript
const DISBURSEMENT_TEMPLATES = {
  bcdx: {
    label: "Báo cáo đề xuất giải ngân",
    path: "report_assets/Disbursement templates/2268.09.PN BCDX giai ngan HMTD.docx",
  },
  giay_nhan_no: {
    label: "Giấy nhận nợ",
    path: "report_assets/Disbursement templates/2268.10.PN Giay nhan no HMTD.docx",
  },
  danh_muc_ho_so: {
    label: "Danh mục hồ sơ vay vốn",
    path: "report_assets/Disbursement templates/2899.01.CV Danh muc ho so vay von.docx",
  },
} as const;
```

## UI Design

### Modal Component: `DisbursementReportModal`

**Location:** `src/components/invoice-tracking/disbursement-report-modal.tsx`

**Props:**
```typescript
{
  loanId: string;
  disbursementId: string;
  onClose: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────────────┐
│  Tạo báo cáo giải ngân            [X]  │
├─────────────────────────────────────────┤
│                                         │
│  Chọn mẫu báo cáo:                     │
│  ┌─────────────────────────────────┐    │
│  │ ○ Báo cáo đề xuất giải ngân    │    │
│  │ ○ Giấy nhận nợ                 │    │
│  │ ○ Danh mục hồ sơ vay vốn      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Thông tin bổ sung (nếu cần):          │
│  ┌─────────────────────────────────┐    │
│  │ Mã chi nhánh: [________]        │    │
│  │ Tên chi nhánh: [________]       │    │
│  │ Danh xưng: [Ông ▼]             │    │
│  │ ...optional fields...           │    │
│  └─────────────────────────────────┘    │
│                                         │
│           [Hủy]  [Tạo báo cáo]         │
└─────────────────────────────────────────┘
```

**Behavior:**
1. User opens modal from disbursement detail or table row action
2. Select template type (radio)
3. Template-specific override fields appear (only fields NOT in DB)
4. Click "Tạo báo cáo" → POST to API → download DOCX
5. Loading state during generation

### Entry Point
Add a "Tạo báo cáo" button (FileText icon from Lucide) to:
- Disbursement table actions (alongside Edit/View)
- Disbursement detail page header

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/services/disbursement-report.service.ts` | Data mapper + report generator |
| CREATE | `src/lib/number-to-vietnamese-words.ts` | Số → chữ converter |
| CREATE | `src/app/api/loans/[id]/disbursements/[disbursementId]/report/route.ts` | API endpoint |
| CREATE | `src/components/invoice-tracking/disbursement-report-modal.tsx` | Modal UI |
| MODIFY | `src/app/report/loans/[id]/page.tsx` | Add report button to table actions |
| MODIFY | `src/lib/i18n/translations.ts` | Add translation keys |

## Implementation Steps

### Step 1: Number-to-words utility
- Create `src/lib/number-to-vietnamese-words.ts`
- Handle: đơn vị, chục, trăm, nghìn, triệu, tỷ
- Handle edge cases: mười, mươi, linh/lẻ, tư, lăm
- Export `numberToVietnameseWords(n: number): string`

### Step 2: Disbursement report service
- Create `src/services/disbursement-report.service.ts`
- `buildReportData(disbursementId)` — maps all DB fields to placeholder dict
- `generateReport(disbursementId, templateKey, overrides?)` — calls docxEngine
- Template registry constant
- Date formatting helpers (dd/mm/yyyy)

### Step 3: API route
- `POST /api/loans/[id]/disbursements/[disbursementId]/report`
- Validate: templateKey enum, optional overrides
- Call service → return DOCX buffer as file download
- Error handling with toHttpError

### Step 4: Modal UI
- Radio selection for template
- Dynamic override fields based on selected template
- Fetch + download flow
- Loading/error states

### Step 5: Integration
- Add FileText icon button to disbursement table row actions
- Add state management for modal open/close
- Translation keys

## Manual Override Fields Per Template

### BCDX (2268.09)
- `Mã CN` (branch code)
- `Tên gọi in hoa` (branch name uppercase)
- `HĐTD.Hạn mức bảo lãnh`
- `GN.Số dư L/C`
- `GN.Số dư bảo lãnh`
- `GN.Tổng mức cấp tín dụng`

### Giấy nhận nợ (2268.10)
- `Mã CN`
- `Tên chi nhánh/PGD`
- `Loại giấy tờ pháp lý`
- `Danh xưng` (Ông/Bà)
- `CMND`, `Ngày cấp`, `Nơi cấp`
- `Số ĐKKD`, `Nơi cấp ĐKKD`, `Ngày cấp ĐKKD`
- `Giấy tờ ủy quyền`
- `GN.Lãi suất vay`
- `HĐTD.Lãi suất quá hạn`
- `HĐTD.Lãi suất chậm trả`

### Danh mục hồ sơ (2899.01)
- `Số điện thoại`
- `Tên người dùng`

## Success Criteria
- [ ] All 3 templates generate correct DOCX with populated data
- [ ] Loop sections (beneficiary table, invoice table) render correctly
- [ ] Number-to-words produces correct Vietnamese text
- [ ] Modal UI is clean, intuitive, matches existing design system
- [ ] Override fields are only shown when needed
- [ ] Download works (Content-Disposition: attachment)

## Risk Assessment
- **Large override field list** for Giấy nhận nợ — could overwhelm UI
  - Mitigation: Group into collapsible sections, save last-used values to localStorage
- **Template XML fragility** — placeholders split across XML runs
  - Mitigation: Use docxtemplater's `paragraphLoop` + test with actual templates
- **Vietnamese number words edge cases**
  - Mitigation: Unit tests covering 0, ones, teens, hundreds, millions, billions
