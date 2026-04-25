---
title: "Template Phuong An Nha Kinh Trong Cat Tuong"
description: "Mo rong loan plan builder ho tro nha kinh nong nghiep trung dai han voi khau hao, bang tra no, HD thi cong"
status: pending
priority: P1
effort: 6h
branch: Customer-type-modules-refactoring
tags: [khcn, loan-plan, greenhouse, template]
created: 2026-03-21
---

# Template Phuong An Nha Kinh Trong Cat Tuong

## Overview

Mo rong loan plan builder de ho tro phuong an vay trung dai han "Dung nha kinh trong Cat tuong" voi:
- Khau hao tai san (nha kinh)
- Bang tra no theo nam (PA_TRANO loop)
- Hop dong thi cong
- Lai suat uu dai nam dau

**Key decision:** Khong can Prisma migration — `financials_json` (JSON string) du chua tat ca fields moi.

## Phases

| Phase | Mo ta | Effort | Status |
|-------|-------|--------|--------|
| 1 | Mo rong types + calculator | 1h | pending |
| 2 | Mo rong XLSX parser Type A | 1h | pending |
| 3 | PA_TRANO loop + placeholders trong builder | 1.5h | pending |
| 4 | Seed template "Nha kinh nong nghiep" | 0.5h | pending |
| 5 | UI form fields moi | 2h | pending |

## Phase Details

-> [Phase 1](./phase-01-types-calculator.md)
-> [Phase 2](./phase-02-xlsx-parser-extension.md)
-> [Phase 3](./phase-03-repayment-schedule-builder.md)
-> [Phase 4](./phase-04-seed-template.md)
-> [Phase 5](./phase-05-ui-form-fields.md)

## Dependencies

- Phase 2, 3, 5 depend on Phase 1 (types)
- Phase 3 depends on Phase 1 (calculator)
- Phase 4 independent
- Phase 5 depends on Phase 1

## Risks

- DOCX template phai co san `[PA_TRANO]` loop markers — can verify template file
- Lai suat uu dai vs standard rate: can 2 rate fields trong financials
