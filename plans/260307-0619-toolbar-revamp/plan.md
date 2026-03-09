---
status: complete
created: 2026-03-07
branch: UI-redesign
cook_flag: --auto
completed: 2026-03-07
---

# Toolbar Revamp - Field Editor

## Overview
Revamp MappingVisualToolbar thanh 5 icon buttons center-aligned voi 3 nhom separator. Move cac chuc nang quan trong (Chon KH, Chon mau, Upload, BCTC) ra toolbar. Don dep sidebar.

## Brainstorm Report
- [brainstorm-260307-0609-toolbar-revamp.md](../reports/brainstorm-260307-0609-toolbar-revamp.md)

## Phases

| Phase | File | Status | Priority | Effort |
|-------|------|--------|----------|--------|
| 1 | [phase-01-toolbar-action-button-and-rewrite.md](phase-01-toolbar-action-button-and-rewrite.md) | complete | high | M |
| 2 | [phase-02-customer-picker-modal.md](phase-02-customer-picker-modal.md) | complete | high | L |
| 3 | [phase-03-template-picker-modal.md](phase-03-template-picker-modal.md) | complete | high | M |
| 4 | [phase-04-sidebar-cleanup-and-wiring.md](phase-04-sidebar-cleanup-and-wiring.md) | complete | medium | M |
| 5 | [phase-05-polish-and-responsive.md](phase-05-polish-and-responsive.md) | complete | low | S |

## Key Decisions
1. 5 nut icon-only, tooltip hover, center-aligned
2. 3 nhom: [KH + Mau] | [Upload + BCTC] | [Option]
3. CustomerPickerModal: chon KH co san + tao moi (move tu tab KH)
4. TemplatePickerModal: extract tu sidebar-context-section
5. Upload trigger file picker truc tiep (reuse handleOcrFileSelected)
6. BCTC: disabled + toast khi chua chon KH
7. Search/filter giu lai, tach row rieng phia duoi toolbar
8. Bo nut "Them field moi" khoi toolbar
9. Sidebar chi con: Merge groups, Noi DOCX, Backup/Khoi phuc, Import/Export

## Dependencies
- Zustand stores: useCustomerStore, useFieldTemplateStore, useUiStore
- API: POST /api/customers (create), GET /api/customers (list)
- Existing hooks: useAiOcrActions (handleOcrFileSelected), useTemplateActions
- FinancialAnalysisModal (existing)
