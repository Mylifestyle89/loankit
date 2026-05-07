---
phase: 5
title: "Tab flatten + language consistency"
status: deferred
priority: P3
effort: 2-3d
blocks: none
---

# Phase 5 — Tab flatten + language (DEFERRED)

Big refactors — defer cho đến khi thực sự cần.

## Tab nesting flatten

**Problem:** Customer detail page hiện 4 levels nested (per Opus review):
- L1: Nơi cho vay / Thông tin / Khoản vay & Tín dụng / PASDV / TSBĐ / In mẫu biểu
- L2: Thông tin chung / Người đồng vay / Người liên quan
- L3: Accordion (Trích xuất từ DOCX)
- L4: Form fields

**Why defer:**
- High regression risk — user muscle memory đã hình thành
- Đòi hỏi UX design session (sketch trước, không jump vào code)
- Visible improvement nhưng không blocking

**Khi nào pick lại:** sau 1-2 tuần phase 1-4 stable, có user feedback feel "lạc đường".

**Approach (sketch first):**
- Replace L1 horizontal tabs → vertical sidebar mini (banking pattern: Internet Banking apps thường dùng)
- Merge L2 vào L1 với prefix: "Thông tin / Đồng vay / Liên quan" thành 3 sub-tabs visual hierarchy thấp hơn
- L3 accordion giữ — useful pattern
- L4 form — đó là form, không phải tab

## Language consistency

**Problem (per Opus review):** Mix Anh/Việt random
- Source/Target/Header/Alias (Anh)
- AI Suggest / Auto-Tagging / Auto Batch (Anh)
- Phân tích TC (Việt viết tắt)
- "Trình chinh field" (typo? "trình chỉnh")

**Why defer:**
- Banking VN có jargon technical mà tiếng Việt không phổ biến (mapping, alias, template). Cần tự research convention Agribank đang dùng (training docs, internal style guide).
- Effort cao: nếu standardize 100% Việt, phải coin thuật ngữ mới (vd "alias" → "tên thay thế" / "bí danh" — không có chuẩn).
- Rủi ro confuse user nếu họ đã quen "mapping" rồi đổi sang "ánh xạ".

**Khi nào pick lại:** sau khi có style guide (workshop với Agribank stakeholders).

**Approach:**
- Compile glossary `docs/glossary-vi.md` (English term → Vietnamese chuẩn)
- 2 mode: pure Vietnamese vs Hybrid (giữ technical jargon Anh, descriptive prose Việt)
- Rec: Hybrid — practical hơn, ít disruptive
- Fix typos ngay (low effort, high signal): "Trình chinh" → "Tinh chỉnh"

## Quick wins KHÔNG cần defer

Có thể nhặt rời các quick wins từ Phase 5 không tốn nhiều:

1. **Fix typo "Trình chinh"** → "Tinh chỉnh" (5 phút)
2. **"AI Suggest"** → "Gợi ý AI" (10 phút)
3. **"Auto-Tagging"** → "Tự động gắn nhãn" (10 phút)

→ Move 3 cái này vào Phase 1 nếu time đủ; không cần đợi Phase 5.
