# Phase 3: Update Navbar + AI Button

## Overview
- Priority: High
- Status: ✅ Complete
- Effort: S

## Description
Cập nhật sidebar navbar: bỏ Mapping + Template riêng lẻ, thêm KHDN. Di chuyển AI button logic.

## Implementation Steps

1. Update `src/app/report/layout.tsx` links array
   - Remove: `{ href: "/report/mapping", ... }` và `{ href: "/report/template", ... }`
   - Add: `{ href: "/report/khdn", label: t("nav.khdn"), icon: PenLine }`
   - Update `isActive` check: `pathname.startsWith("/report/khdn")`

2. Update AI CTA button
   - Change `isMappingPage` check: `pathname.startsWith("/report/khdn")`
   - Update redirect: `/report/mapping?openAiSuggestion=1` → `/report/khdn/ai-suggest`
   - Hoặc giữ dispatch event nếu đang ở KHDN mapping tab

3. Update `GlobalModalProvider` import path
   - From: `./mapping/components/GlobalModalProvider`
   - To: `./khdn/mapping/components/GlobalModalProvider`

4. Add i18n key `nav.khdn` trong translations

## Related Files
- Edit: `src/app/report/layout.tsx`
- Edit: `src/lib/i18n/translations.ts` (add nav.khdn)

## Success Criteria
- [x] Navbar shows: Customers | Loans | Invoices | KHDN | System Ops | Guide
- [x] KHDN nav item active khi ở bất kỳ sub-route
- [x] AI button hoạt động đúng
