# Phase 2: Navigation + Routing

**Priority:** High | **Effort:** S | **Status:** Pending | **Blocked by:** Phase 1

## Overview

Add "Quản lý mẫu" link to KHCN navigation so users can access the templates page.

## Related Code Files

**Modify:**
- `src/app/report/layout.tsx` — Add nav item for KHCN templates

OR add sub-navigation within KHCN section (like KHDN has customers + template tabs).

## Implementation Options

### Option A: Sidebar nav item (simplest)
Add entry in sidebar nav array:
```tsx
{ href: "/report/khcn/templates", label: "Mẫu KHCN", icon: FileText }
```

### Option B: Sub-tabs in KHCN
Like KHDN has separate pages for customers and templates.
KHCN root redirect already goes to /report/khcn/customers.
Adding /report/khcn/templates follows same pattern.

**Recommend Option A** — consistent with sidebar nav pattern.

## Todo

- [ ] Add nav item in layout.tsx sidebar
- [ ] Compile check
- [ ] Verify navigation works

## Success Criteria

- [ ] "Mẫu KHCN" visible in sidebar
- [ ] Clicking navigates to templates page
- [ ] Active state highlights correctly
