# Plan: KHCN Tiêu dùng Templates

**Status:** Draft | **Branch:** main | **Created:** 2026-04-05

## Goal

Thêm template BCĐX + PASDV tiêu dùng vào hệ thống KHCN, routing dựa trên `income_source_type`.

## Context

- BCĐX tiêu dùng DOCX đã có: `2268.02A BCDXCV tieu dung co TSBD.docx` (narrative-style, có placeholders HĐTD.*, SĐ.*, TV.*, NLQ.*)
- PASDV tiêu dùng DOCX đã có: `2268.01B PASDV vay phuc vu doi song co TSBD.docx`
- BCĐX SXKD ngắn hạn đã có: `2268.02B BCDXCV ngan han co TSBD cat tuong.docx` (tabular-style, dùng cho nguồn trả nợ nông nghiệp/kinh doanh)
- Data builders hiện có cover ~70% placeholders. Cần extend cho tiêu dùng-specific fields.

## Decisions (from brainstorm)

1. Chia BCĐX theo FORMAT nguồn trả nợ: narrative (lương/thuê) vs tabular (nông nghiệp/KD)
2. PASDV: dùng template có sẵn cho tiêu dùng
3. Phần thẩm định lại (C): BỎ — quy định mới không cần
4. BBKT: reuse mẫu hiện tại, thêm `"tieu_dung"` vào methods
5. Ô tô: defer
6. Data: thêm `income_source_type` vào `financials_json`

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Registry + Schema](phase-01-registry-schema.md) | TODO | S |
| 2 | [Data Builder](phase-02-data-builder.md) | TODO | M |
| 3 | [UI Form](phase-03-ui-form.md) | TODO | S |
| 4 | [Test + Validate](phase-04-test-validate.md) | TODO | S |

## Key Dependencies

- Existing: `khcn-template-registry.ts`, `khcn-builder-loan-plan.ts`, `loan-plan-schemas.ts`
- Template DOCX files already exist in `report_assets/KHCN templates/`
