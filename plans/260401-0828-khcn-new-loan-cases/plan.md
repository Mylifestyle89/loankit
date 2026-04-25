---
title: "KHCN: Cam co GTCG + Vay khong TSBD"
description: "Extend tiet_kiem for GTCG subtype; allow unsecured loans without collateral"
status: pending
priority: P2
effort: 6h
branch: main
tags: [khcn, collateral, loan-case, docx]
created: 2026-04-01
---

# KHCN: 2 New Loan Case Types

## Summary

Two new cases for KHCN loan module:
1. **Cam co giay to co gia (GTCG)**: Extend existing `tiet_kiem` collateral with subtype selector (The tiet kiem vs GTCG)
2. **Vay khong TSBD**: Allow loans to proceed with empty collateral selection, skip collateral data building

## Current Architecture

- 4 collateral types: `qsd_dat`, `dong_san`, `tiet_kiem`, `tai_san_khac`
- Collateral config: `collateral-config.ts` (types, form fields, labels)
- Data builders: `khcn-builder-collateral-savings-other.ts` (TK.* and TSK.* prefixes)
- Report service: `khcn-report.service.ts` orchestrates all builders
- Template registry: `khcn-template-registry.ts` + `khcn-asset-template-registry.ts`
- Collateral picker: `loan-collateral-picker.tsx` (shows warning when 0 selected, falls back to "all")
- No existing DOCX templates for cam co GTCG or unsecured loans in `report_assets/`

## Phases

| # | Phase | Est | Status |
|---|-------|-----|--------|
| 1 | [GTCG subtype: config + form + builder](phase-01-gtcg-subtype.md) | 3h | pending |
| 2 | [Unsecured loan: UI + service logic](phase-02-unsecured-loan.md) | 2h | pending |
| 3 | [Template registry + DOCX templates](phase-03-templates.md) | 1h | pending |

## Key Decisions

- **No new collateral_type** for GTCG: reuse `tiet_kiem` with a `subtype` property field
- **No new loan_method** for unsecured: allow `selectedCollateralIds = []` to mean "khong TSBD"
- **No DB migration**: subtype stored in `properties_json` (existing JSON field)
- DOCX templates for GTCG/unsecured: **need user to provide** or create placeholders

## Dependencies

- DOCX templates must be created/provided for both cases
- Existing `tiet_kiem` data in DB is backward compatible (no subtype = default "the_tiet_kiem")
