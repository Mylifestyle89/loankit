---
phase: 7
title: "PascalCase to kebab-case Rename"
status: complete
effort: 3h
depends_on: [1, 2, 3, 4, 5, 6]
---

# Phase 7: PascalCase → kebab-case Rename

## Prerequisites

ALL phases 1-6 must be complete and compile-verified before starting.

## File Ownership

This phase touches ALL files in the codebase (import updates). Must run sequentially, after all other phases.

## Rename Map

### src/app/report/khdn/mapping/components/

| Current | New |
|---------|-----|
| AdvancedJsonPanel.tsx | advanced-json-panel.tsx |
| EditingTemplateBanner.tsx | editing-template-banner.tsx |
| FieldCatalogBoard.tsx | field-catalog-board.tsx (if not already renamed by Phase 1 split) |
| FieldRow.tsx | field-row.tsx (if not already renamed by Phase 1 split) |
| GlobalModalProvider.tsx | global-modal-provider.tsx |
| MappingCanvas.tsx | mapping-canvas.tsx |
| MappingHeader.tsx | mapping-header.tsx |
| MappingModals.tsx | mapping-modals.tsx (if not already renamed by Phase 1 split) |
| MappingSidebar.tsx | mapping-sidebar.tsx |
| MappingStatusBar.tsx | mapping-status-bar.tsx |
| MappingTabSwitch.tsx | mapping-tab-switch.tsx |
| MappingVisualSection.tsx | mapping-visual-section.tsx |
| MappingVisualToolbar.tsx | mapping-visual-toolbar.tsx |
| ModalRegistry.tsx | modal-registry.tsx |
| SystemLogCard.tsx | system-log-card.tsx |
| ValidationResultPanel.tsx | validation-result-panel.tsx |

### src/app/report/khdn/mapping/components/Modals/

| Current | New |
|---------|-----|
| AddFieldModal.tsx | add-field-modal.tsx |
| AiMappingModal.tsx | ai-mapping-modal.tsx (if not already renamed by Phase 1) |
| ChangeFieldGroupModal.tsx | change-field-group-modal.tsx |
| CreateMasterTemplateModal.tsx | create-master-template-modal.tsx |
| CustomerPickerModal.tsx | customer-picker-modal.tsx (if not already by Phase 1) |
| DeleteConfirmModal.tsx | delete-confirm-modal.tsx |
| DeleteGroupConfirmModal.tsx | delete-group-confirm-modal.tsx |
| DocxMergeModal.tsx | docx-merge-modal.tsx (if not already by Phase 1) |
| EditGroupModal.tsx | edit-group-modal.tsx |
| FieldTemplateModals.tsx | field-template-modals.tsx |
| FinancialAnalysisModal.tsx | financial-analysis-modal.tsx (if not already by Phase 1) |
| FormulaModal.tsx | formula-modal.tsx |
| FunctionListModal.tsx | function-list-modal.tsx |
| ImportBackupModal.tsx | import-backup-modal.tsx |
| ImportGroupPromptModal.tsx | import-group-prompt-modal.tsx |
| ImportTemplateGroupModal.tsx | import-template-group-modal.tsx |
| MergeGroupsModal.tsx | merge-groups-modal.tsx |
| OcrReviewModal.tsx | ocr-review-modal.tsx (if not already by Phase 1) |
| SnapshotRestoreModal.tsx | snapshot-restore-modal.tsx (if not already by Phase 1) |
| TemplatePickerModal.tsx | template-picker-modal.tsx |

### src/components/

| Current | New |
|---------|-----|
| ui/BaseModal.tsx | ui/base-modal.tsx |
| ui/ThemeToggle.tsx | ui/theme-toggle.tsx |
| FinancialAnalysisModal.tsx | financial-analysis-modal.tsx |

### Modals/ directory rename (Red Team #5: Windows NTFS case-insensitive)

**⚠️ CRITICAL:** `git mv Modals modals` fails on Windows (creates nested `modals/Modals/`).

**Required 2-step approach:**
```bash
git mv Modals _modals_temp
git mv _modals_temp modals
```

## Execution Strategy

Use `git mv` for each rename to preserve git history.

```bash
# For each file:
git mv "src/path/OldName.tsx" "src/path/new-name.tsx"
```

Then update imports **(Red Team #4: NOT blind sed)**:

**Option A (preferred):** TypeScript-aware codemod
```bash
npx jscodeshift -t .claude/scripts/rename-imports.ts --extensions=ts,tsx src/
```

**Option B (fallback):** Precise regex with word boundary
```bash
# Use \b word boundary to prevent substring matches
grep -rl "\bfrom.*['\"].*\/OldName['\"]" src/ | xargs sed -i "s|\b/OldName\b|/new-name|g"
```

**⚠️ NEVER use:** `sed -i 's|/OldName|/new-name|g'` (matches substrings like FieldRowControls)

### Automation script approach

Create a rename script that:
1. Maps old → new filenames
2. Runs `git mv` for each (2-step for directories on Windows)
3. Updates all import paths via codemod (not blind sed)
4. Runs `npx tsc --noEmit` to verify

## Import Update Checklist

- Every file that imports a renamed file must be updated
- Use grep to find all consumers before renaming
- Verify no dynamic imports reference PascalCase filenames
- Check for string literals referencing file paths (unlikely in components)

## Compile Verification

```bash
npx next build
```

Full build (not just tsc) since this is the final phase.

## Todo

- [x] Create rename mapping script
- [x] Rename Modals/ → modals/ directory
- [x] Rename all 16 PascalCase files in mapping/components/
- [x] Rename all 20 PascalCase files in mapping/components/Modals/
- [x] Rename 3 PascalCase files in src/components/
- [x] Update all import paths across codebase
- [x] Check for Phase 1 files already renamed (skip those)
- [x] Verify: `npx tsc --noEmit`
- [x] Full build: `npx next build`
