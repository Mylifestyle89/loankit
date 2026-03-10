---
title: "Customer Data Hub - Cross-tab Customer Selection"
description: "Elevate Customer List tab as central DB hub with global customer selection across all report tabs"
status: complete
priority: P1
effort: 3h
branch: Deploy-test
tags: [state-management, zustand, cross-tab-sync, ux]
created: 2026-03-09
---

# Customer Data Hub

## Problem
- Customer data fetched independently in Loans, Invoices, Customers tabs (3x redundant API calls)
- `useCustomerStore` only used in Mapping tab, not shared
- No global customer selection - user must re-select customer in each tab
- No visual indicator of selected customer across tabs

## Solution
Promote existing `useCustomerStore` to shared store. Add global customer selection that auto-filters Loans/Invoices. Add customer context indicator in sidebar.

## Architecture

```
useCustomerStore (shared, Zustand + persist)
    |
    +-- Sidebar: CustomerContextIndicator (show selected customer)
    +-- Customers tab: selects customer, populates store
    +-- Mapping tab: reads from store (already works)
    +-- Loans tab: reads selectedCustomerId, auto-filters
    +-- Invoices tab: reads selectedCustomerId, auto-filters
```

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Relocate store + shared hook](./phase-01-shared-store.md) | complete | 1h |
| 2 | [Integrate tabs + sidebar indicator](./phase-02-integrate-tabs.md) | complete | 2h |

## Key Decisions
- Reuse existing Zustand store (not new Context/Provider) - KISS
- Keep localStorage persistence for selectedCustomerId
- Customer list still fetched from API but cached in store (single source)
- Tabs auto-filter when selectedCustomerId set, but user can still manually override filter
