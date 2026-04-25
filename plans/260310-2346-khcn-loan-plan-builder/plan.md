---
title: "KHCN Module + Loan Plan Builder"
description: "Individual customer support with 4 loan methods, standardized fields/templates, PA builder with 6 categories"
status: completed
priority: P1
effort: 38h
branch: KHCN-implement
tags: [khcn, loan-plan, customer, prisma, docx, apc]
created: 2026-03-10
---

## Overview

Extend Customer model with `customer_type` discriminator. Support 4 loan methods with standardized fields (17 unified) and templates (~37 unique, organized as Chung + per-method). Build Loan Plan Builder for 6 PA categories.

## Standardization Summary

- **Customer fields:** 12 core + 5 optional = 17 total (unified across 4 methods)
- **AssetCategories:** 10 section types, config-driven per method
- **DOCX templates:** ~9 chung + ~28 method-specific = ~37 unique (down from ~87)
- **HĐTD schema:** 1 unified with conditional fields
- **Template org:** `report_assets/KHCN templates/{Chung, per-method folders}`

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Schema migration | 4h | completed | [phase-01](phase-01-schema-migration.md) |
| 2 | Customer service extension | 3h | completed | [phase-02](phase-02-customer-service.md) |
| 3 | Customer UI update | 4h | completed | [phase-03](phase-03-customer-ui.md) |
| 4 | Data import (.bk + .apc) | 3h | completed | [phase-04](phase-04-data-import.md) |
| 5 | DOCX template management | 5h | completed | [phase-05](phase-05-docx-templates.md) |
| 6 | Loan Plan Builder - backend | 6h | completed | [phase-06](phase-06-loan-plan-backend.md) |
| 7 | Loan Plan Builder - UI | 6h | completed | [phase-07](phase-07-loan-plan-ui.md) |
| 8 | Seed PA templates | 4h | completed | [phase-08](phase-08-seed-templates.md) |
| 9 | Loan method workflow | 3h | completed | [phase-09](phase-09-loan-method-workflow.md) |

## Key Dependencies

- Phase 1 blocks all others
- Phase 6 blocks 7, 8
- Phases 2-5 parallelizable after Phase 1
- Phase 9 depends on Phase 5

## Key Decisions

- SHARED Customer model + `customer_type` discriminator
- 17 unified individual fields (not per-method schemas)
- Config-driven AssetCategories per loan_method (not hardcoded)
- Template folders: Chung + per-method; UI auto-merges on method selection
- `.bk` = data instance, `.apc` = template schema → both parsers needed
- Định mức KTKT 2022.xls = default prices, user-adjustable

## 4 Loan Methods

| Method | `loan_method` | Sections | PA? | Unique DOCX |
|--------|--------------|----------|-----|-------------|
| Từng lần ngắn hạn | `tung_lan` | UNC,GN,HĐTD,PA,SĐ,TV,VBA,TCTD | ✅ | ~6 |
| Hạn mức | `han_muc` | +NLQ,ĐS (all 10) | ✅ | ~4 |
| Trung/dài hạn | `trung_dai` | UNC,GN,HĐTD,PA,SĐ,TV,NLQ,ĐS | ✅ | ~8 |
| Tiêu dùng có TSBĐ | `tieu_dung` | UNC,GN,HĐTD,SĐ,TV,NLQ,ĐS | ❌ | ~10 |

---

## Completion Summary

All phases completed across multiple sessions (2026-03-10 to 2026-04-01). Total effort: 38h deployed successfully. KHCN module and loan plan builder fully operational with 4 loan methods, standardized fields/templates, and PA builder.
