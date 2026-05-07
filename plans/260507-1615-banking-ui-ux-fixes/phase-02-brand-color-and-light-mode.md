---
phase: 2
title: "Brand color decision + light mode neutralize"
status: ready (Q1 = C locked)
priority: P1
effort: 1-2d
blocks: phase-04
decision: "Q1 = C (Hybrid) locked 2026-05-07"
---

# Phase 2 — Brand color + light mode

## Locked decision — Q1 = C (Hybrid)

- **Primary** (navigation, active states, links, primary buttons CTA general): **emerald-600 `#059669`** (banking trust + nhóm 1 signal)
- **Accent** (special actions: Tạo BCĐX, Tải báo cáo, AI features): cam **`#E8453C`** (Claude personality preserved)
- **Danger/Error** (destructive actions, errors): red-600 `#DC2626` (separate from accent cam — avoid confusion)

## Original Q1 options (for reference)

| Option | Primary | Accent | Trust signal | Effort | Notes |
|---|---|---|---|---|---|
| **A — Keep Claude orange** | `#E8453C` cam | dùng cam cho mọi primary action | Energetic/promotional. Mismatch banking trust standard. | 0 (no change) | User hiện thích vì giống Claude personal preference |
| **B — Switch emerald banking** | `#059669` (emerald-600) | cam reserved cho urgent/alert only | Trust + nhóm 1 (good debt) signal. Industry-aligned. | ~1d (token swap + audit ~50 components) | Fits financial industry pattern (Stripe green, Wise green, etc.) |
| **C — Hybrid** | emerald primary actions | cam = accent cho CTA quan trọng (Tạo BCĐX, Export) + danger states | Trust core + brand personality preserved | ~1d (similar to B) | Best of both — emerald authority, cam personality |

**Khuyến nghị: C (Hybrid)** — giữ cam như "signature color" cho actions đặc biệt (Tạo BCĐX, Tải báo cáo), dùng emerald cho navigation/active state/badges/links. Vừa giữ cảm giác Claude-style vừa banking-appropriate.

## Light mode neutralize (independent of Q1)

**Symptom (per Opus review):** background tone kem/vàng (#F8F5F2 ish) → "ố vàng cũ kỹ".

**Fix:**
1. Audit Tailwind config / theme files: locate background tokens
2. Swap warm tones → cool neutral:
   - Body bg: `#F8F5F2` → `#F8FAFC` (slate-50) hoặc `#FFFFFF` thuần
   - Card bg: `#FFFFFF` (giữ)
   - Border: warm gray → `#E2E8F0` (slate-200)
   - Muted text: ensure ≥`#475569` (slate-600) cho 4.5:1 contrast
3. Sidebar active state light mode: cam nhạt nền + cam text → contrast thấp
   - Fix per Q1 decision: nếu B/C → emerald-100 bg + emerald-700 text
   - Nếu A → cam-100 bg + cam-800 text (đậm hơn)

## Implementation steps (post Q1 decision)

### 2a — Token swap (`tailwind.config.ts` + globals.css)

Add semantic tokens: `primary` / `accent` / `success` / `warning` / `danger`. Updated từ Q1 decision.

### 2b — Component audit + bulk replace

Grep `bg-(brand|orange|primary)|text-(brand|orange)` → map mỗi instance → semantic role → replace.

### 2c — Light mode contrast verify

Verify ≥4.5:1 contrast on sidebar active, form borders, stat cards, tooltips.

### 2d — Stat cards urgency (per Opus review)

Color-code threshold (vd `>50 chứng từ chờ` → warning text). Defer trend arrow nếu chưa track history.

## Acceptance

- Light mode neutral (không vàng)
- Sidebar active contrast ≥4.5:1
- Brand decision documented `docs/design-tokens.md`
- Stat cards có urgency hint
- Dark mode no regression

## Risks

- 50+ touchpoints — manual review từng cái
- shadcn theme cần update theo
- Có thể stretch dài sang phase 4
