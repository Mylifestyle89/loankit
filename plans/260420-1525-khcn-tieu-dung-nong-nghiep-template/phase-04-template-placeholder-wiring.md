# Phase 4: Template + Placeholder Registry Wiring

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1h
- **Depends on:** Phase 3

Dang ky placeholder "HĐTD.Tổng thu nhập từ nông nghiệp" trong registry, verify template BCDX 2268.02A tieu dung chap nhan placeholders nong nghiep + PA_TRANO loop.

## Key Insights

- `khcn-placeholder-registry.ts` hien co group "Khấu hao & Nhà kính" + "Bảng trả nợ theo năm" — se reuse, ap cho ca tieu dung
- `HĐTD.Tổng thu nhập từ lương` + `...từ SXKD` da co — can them `...từ nông nghiệp` + `...từ cho thuê` (cho thue chua trong scope phase nay nhung them luon cho full enum)
- Template DOCX file `2268.02A BCDXCV tieu dung co TSBD.docx` phai duoc user update manually — code khong the tac dong file binary

## Related Code Files

### Modify
- src/lib/report/khcn-placeholder-registry.ts — them placeholder `HĐTD.Tổng thu nhập từ nông nghiệp`, `HĐTD.Tổng thu nhập từ cho thuê`
- src/lib/report/khcn-template-validator.ts (neu can) — ensure khong reject placeholder tren khi template method = tieu_dung

### Manual (user action, out-of-code)
- report_assets/KHCN templates/Báo cáo đề xuất/2268.02A BCDXCV tieu dung co TSBD.docx — user cap nhat placeholders + loop `[#PA_TRANO]...[/PA_TRANO]` trong file Word

## Implementation Steps

### 1. Mo rong placeholder registry
Trong `khcn-placeholder-registry.ts`, tim group "HĐTD - Thu nhập" (hoac tuong duong), them:
```typescript
{
  label: "HĐTD - Thu nhập",
  prefix: "HĐTD",
  items: [
    "HĐTD.Tổng thu nhập từ lương",
    "HĐTD.Tổng thu nhập từ SXKD",
    "HĐTD.Tổng thu nhập từ nông nghiệp",  // NEW
    "HĐTD.Tổng thu nhập từ cho thuê",     // NEW (completeness)
  ],
}
```

### 2. Verify validator logic
Trong `khcn-template-validator.ts`:
- Doc lai logic check `placeholder exists in registry`
- Dam bao khong filter theo method -> placeholder moi ap dung cho ca tieu_dung

### 3. Template file instruction
Tao doc huong dan user cap nhat file .docx:
```
File: report_assets/KHCN templates/Báo cáo đề xuất/2268.02A BCDXCV tieu dung co TSBD.docx

Them vao section Nguon tra no (con ditional theo income_source):
- {HĐTD.Tổng thu nhập từ nông nghiệp}
- {PA.Khấu hao nhà kính}
- {PA.Số năm khấu hao}
- {PA.Đơn giá nhà kính/sào}
- {PA.Số sào đất}

Loop bang tra no:
[#PA_TRANO]
| {Năm} | {Thu nhập trả nợ} | {Dư nợ} | {Gốc trả} | {Lãi trả} | {TN còn lại} |
[/PA_TRANO]
```

Ghi vao `docs/khcn-tieu-dung-nong-nghiep-template-placeholders.md` (file huong dan cho bien tap vien).

### 4. Template registry tag (optional)
Co the them `supportsAgriculture: true` vao entry BCDX 2268.02A trong `khcn-template-registry.ts` de UI hien "Co ho tro nong nghiep" — **SKIP** (YAGNI, khong can ngay).

## Todo List
- [ ] Them 2 placeholder moi vao registry
- [ ] Verify validator khong reject
- [ ] Viet doc huong dan cap nhat file .docx
- [ ] Compile check
- [ ] Inform user update BCDX 2268.02A template file

## Success Criteria
- Registry export `HĐTD.Tổng thu nhập từ nông nghiệp`
- Validator pass khi chay builder tieu dung agriculture
- Doc huong dan rõ vi tri placeholder trong file .docx

## Risk Mitigation
- Neu user chua update template .docx, builder chay -> placeholders khong duoc replace (hien nhu `{HĐTD.Tổng...}`). Nen co warning/log khi deploy.
- Test voi template cu truoc: khong co placeholder moi -> builder phai khong crash (chi skip)

## Unresolved Questions
- Ai se cap nhat file .docx BCDX tieu dung — user hay dev (neu co Word access)?
- Co can versioning file template (copy `2268.02A v2.docx`) de rollback duoc khong?
