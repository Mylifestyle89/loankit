# Customer Data Management — Full View, Export & Import

## Overview

Nâng cấp hệ thống quản lý khách hàng để:
1. **View đầy đủ** tất cả dữ liệu liên quan của 1 khách hàng (loans, disbursements, invoices, beneficiaries, templates)
2. **Export** toàn bộ dữ liệu khách hàng ra JSON/XLSX
3. **Import** dữ liệu khách hàng từ file JSON/XLSX đã export

## Current State

- Customer detail page (`/report/customers/[id]`) chỉ hiển thị basic fields (name, code, address...)
- Export/Import API (`/api/report/export-data`, `/api/report/import-data`) chỉ export customer fields + templates, **không bao gồm** loans, disbursements, invoices
- Không có XLSX support cho customer export/import

## Target State

- Customer detail page hiển thị **tất cả** data: basic info + loans + disbursements + invoices + beneficiaries + mapping instances
- Export ra JSON/XLSX bao gồm **toàn bộ** relational data
- Import có thể tái tạo lại toàn bộ data từ file export

## Phases

| # | Phase | Status | Priority | Effort |
|---|-------|--------|----------|--------|
| 1 | Customer full-view API & service | **done** | high | medium |
| 2 | Customer detail page UI upgrade | **done** | high | medium |
| 3 | Full export API (JSON + XLSX) | **done** | high | medium |
| 4 | Full import API (JSON + XLSX) | **done** | high | medium |
| 5 | Update customers list page (export/import UI) | **done** | medium | small |

## Key Dependencies

- Phase 2 depends on Phase 1 (API first, UI second)
- Phase 4 depends on Phase 3 (import format must match export format)
- Phase 5 depends on Phase 3 & 4

## Tech Stack

- Next.js App Router (existing)
- Prisma + SQLite (existing)
- `xlsx` package for XLSX support (need to check if installed)
- Streaming JSON for large exports (existing pattern)
