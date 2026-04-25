---
status: pending
created: 2026-03-24
slug: khcn-template-validation-layer
brainstorm: plans/reports/brainstorm-260324-1610-khcn-template-validation-layer.md
---

# KHCN Template Validation Layer

Cross-validation system checking 3 coupled layers (template registry, placeholder registry, data builders) at dev startup + build time.

## Problem

Adding new KHCN template types/placeholders breaks app silently because no validation exists between:
- Template Registry (62+97 templates) ↔ DOCX files on disk
- Placeholder Registry (22 groups, 100+ fields) ↔ DOCX tags inside templates
- Data Builders (15+ builder functions) ↔ Placeholder keys

## Phases

| Phase | Description | Status | Effort |
|-------|-------------|--------|--------|
| [Phase 1](phase-01-docx-tag-scanner.md) | DOCX Tag Scanner — extract `[placeholder]` tags from DOCX files | pending | 0.5d |
| [Phase 2](phase-02-cross-validation-engine.md) | Cross-Validation Engine — compare 3 layers, report mismatches | pending | 1d |
| [Phase 3](phase-03-integration-scripts.md) | Integration — dev startup warning + build-time error + npm scripts | pending | 0.5d |

## Key Dependencies

- PizZip (already installed) — read DOCX zip
- Vitest (already installed) — test the validator
- No new dependencies needed

## Success Criteria

- Zero false positives on current codebase
- Dev gets actionable error within seconds when adding template/placeholder
- Build fails on critical mismatches (missing DOCX file, invalid method)
- Build warns on non-critical (orphan tags, missing builders)
