---
title: "Loop-first PA data builder cho KHCN DOCX"
description: "Refactor buildLoanPlanExtendedData sang loop arrays, sửa DOCX templates"
status: pending
priority: P1
effort: 3h
branch: KHCN-implement
tags: [refactor, backend, docx]
created: 2026-03-13
---

# Loop-first PA Data Builder cho KHCN DOCX

## Overview

Thay thế hardcoded costNameMap (13 tên nông nghiệp cố định) bằng universal loop arrays `PA_CHIPHI` / `PA_DOANHTHU`. Cho phép mọi category phương án (nông nghiệp, kinh doanh, chăn nuôi, ăn uống, xây dựng, hạn mức) render vào DOCX template mà không cần sửa code.

## Context

- Brainstorm: [brainstorm report](../reports/brainstorm-260313-2134-loan-plan-docx-embedding.md)

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Refactor data builder | Pending | 1h | [phase-01](./phase-01-refactor-data-builder.md) |
| 2 | Update DOCX templates | Pending | 1h | [phase-02-update-docx-templates.md](./phase-02-update-docx-templates.md) |
| 3 | Test & verify | Pending | 1h | [phase-03](./phase-03-test-verify.md) |

## Dependencies

- Phase 2 depends on Phase 1 (need to know exact loop variable names)
- Phase 3 depends on both Phase 1 + 2
