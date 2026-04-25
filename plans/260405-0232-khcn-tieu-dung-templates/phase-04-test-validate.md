# Phase 4: Test + Validate

**Priority:** Medium | **Status:** TODO | **Effort:** S

## Overview

Kiểm tra compile, validate templates, test generate DOCX.

## Steps

### 4.1 Compile check
```bash
npx tsc --noEmit
```

### 4.2 Template validation
```bash
npx tsx scripts/validate-khcn-templates.ts
```

### 4.3 Manual test
- Tạo khách hàng test → chọn loan_method "Tiêu dùng"
- Chọn income_source_type "Lương" → generate BCĐX → verify placeholders filled
- Chọn income_source_type "Nông nghiệp" → generate BCĐX SXKD → verify bảng biểu
- Generate PASDV tiêu dùng → verify
- Generate BBKT → verify "tieu_dung" method works

### 4.4 Existing test suite
```bash
npx vitest run src/services/__tests__/khcn-report-data-builders.test.ts
```

## Success Criteria

- [ ] 0 compile errors
- [ ] Template validator pass
- [ ] DOCX generate OK cho cả narrative và tabular
- [ ] Existing tests không bị break
