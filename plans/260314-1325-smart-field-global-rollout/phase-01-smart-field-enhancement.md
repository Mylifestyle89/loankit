---
phase: 1
title: "SmartField Enhancement & Batch Hook"
status: pending
effort: 1h
---

# Phase 1: SmartField Enhancement & Batch Hook

## Context
- [SmartField component](../../src/components/smart-field.tsx) - 145 lines
- [useDropdownOptions hook](../../src/lib/hooks/use-dropdown-options.ts) - 52 lines
- [Dropdown API route](../../src/app/api/config/dropdown-options/route.ts) - 45 lines

## Overview
Enhance SmartField UX (hover [+] button) and create batch loading infrastructure to avoid N+1 API calls when a section has many SmartField instances.

## Key Insights
- Current: mỗi SmartField mount = 1 GET request. Collateral có ~14 text fields = 14 requests
- Solution: 1 request per section prefix, share data via React Context
- SmartField đã dùng ở page.tsx (12 fields, flat keys) và branch-staff (4 fields, flat keys)

## Requirements

### Functional
1. SmartField nút [+] ẩn mặc định, hiện khi hover
2. Khi có options: ListPlus icon luôn hiện (không cần hover)
3. `useDropdownOptionsGroup(prefix)` hook - fetch all options matching prefix in 1 call
4. `DropdownOptionsProvider` context - wrap section, pass batch-loaded data to children
5. SmartField tự detect context: nếu có Provider → dùng data từ context, nếu không → fallback fetch riêng
6. API route hỗ trợ `?prefix=collateral.` query param

### Non-functional
- Backward compatible: SmartField không có Provider vẫn hoạt động như cũ
- No loading flash khi data đã có trong context

## Architecture

```
DropdownOptionsProvider (prefix="collateral.")
  └─ fetches ALL options where field_key LIKE 'collateral.%'
  └─ provides Map<fieldKey, DropdownItem[]> via context
      ├─ SmartField fieldKey="collateral.certificate_name" → reads from context
      ├─ SmartField fieldKey="collateral.land_purpose" → reads from context
      └─ ...
```

## Related Code Files

### Modify
- `src/components/smart-field.tsx` - hover behavior + context consumption
- `src/lib/hooks/use-dropdown-options.ts` - add useDropdownOptionsGroup
- `src/app/api/config/dropdown-options/route.ts` - add prefix query support

### Create
- `src/lib/hooks/dropdown-options-context.tsx` - DropdownOptionsProvider + context

## Implementation Steps

### 1. Update API route - add prefix support
```
GET /api/config/dropdown-options?prefix=collateral.
→ WHERE field_key LIKE 'collateral.%'
→ Returns grouped: { ok: true, groups: { "collateral.certificate_name": [...], ... } }
```
Keep existing `?field_key=` param working for backward compat.

### 2. Create useDropdownOptionsGroup hook
In `src/lib/hooks/use-dropdown-options.ts`:
- `useDropdownOptionsGroup(prefix: string)` → returns `Map<string, DropdownItem[]>`, loading, addOption(fieldKey, label), deleteOption(id)
- Single fetch on mount, groups response by fieldKey

### 3. Create DropdownOptionsProvider
In `src/lib/hooks/dropdown-options-context.tsx`:
- React context providing: `getOptions(fieldKey)`, `addOption(fieldKey, label)`, `deleteOption(id)`, `loading`
- Wraps `useDropdownOptionsGroup` internally

### 4. Update SmartField - hover UX + context
In `src/components/smart-field.tsx`:
- Try `useContext(DropdownOptionsContext)` first; if null, fallback to `useDropdownOptions(fieldKey)`
- Add hover state: wrap button in container with `group` class, button gets `opacity-0 group-hover:opacity-100`
- Exception: when `hasOptions=true`, ListPlus icon always visible (no hover gate)

## Todo List
- [ ] API: add `?prefix=` query param support to GET route
- [ ] Hook: create `useDropdownOptionsGroup(prefix)`
- [ ] Context: create `DropdownOptionsProvider` + context
- [ ] SmartField: hover-to-show [+] button
- [ ] SmartField: consume context when available, fallback to individual fetch
- [ ] Test: verify backward compat (SmartField without Provider still works)

## Success Criteria
- SmartField [+] button hidden by default, shown on hover
- ListPlus icon always visible when options exist
- Wrapping N SmartFields in Provider → only 1 API call
- Existing SmartField usage (page.tsx, branch-staff) still works without changes
