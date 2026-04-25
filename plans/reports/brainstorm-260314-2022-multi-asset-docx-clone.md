# Brainstorm: Multi-Asset DOCX Template Rendering

## Problem
- DOCX templates use flat placeholders (`{SĐ.Tên TSBĐ}`, `{ĐS.Nhãn hiệu}`) — only render 1 asset per type
- Need: 1 DOCX file containing ALL assets of same type
- Applies to all collateral types: BĐS, Động sản, Tiết kiệm, Tài sản khác

## Evaluated Approaches

### A: Edit DOCX templates — add loop syntax
- Pro: docxtemplater native loop support
- Con: 70+ templates to edit manually, user nghiệp vụ can't maintain

### B: Clone section programmatically ✅ CHOSEN
- Pro: no template edits, backward compatible, user-friendly
- Con: DOCX XML manipulation complexity

### C: Hybrid (loop for summary tables, clone for detail)
- Pro: precise control
- Con: 2 mechanisms, more complexity

## Final Solution: Clone Section (B)

**Scope**: Only TSBĐ templates (7 asset sub-categories)
**Separator**: No page break — continuous flow
**Mechanism**:
1. Scan template XML for prefix patterns (SĐ., ĐS., TK., TSK.)
2. Clone entire body content N times (N = collateral count of same type)
3. Replace prefix → indexed: `SĐ.` → `SĐ_1.`, `SĐ_2.`...
4. Build indexed data dict from existing extract helpers
5. Render with docxtemplater as usual

**Key decisions**:
- Auto-detect prefix in XML — no manual config per template
- Backward compat: 1 asset → clone once = unchanged behavior
- Only applies to asset templates, other tabs keep flat rendering

**Risks**:
- DOCX XML structure complexity (tables, paragraphs, sections)
- Headers/footers must be skipped during clone
- Complex layouts may break formatting

## Implementation Points
- New utility: `docx-section-cloner.ts`
- Update data builders: add indexed dict builder
- Update generate API: detect asset template → clone before render
