---
title: Turso ↔ VPS DB sync strategy brainstorm
created: 2026-05-07
type: brainstorm
status: decided
---

# Turso ↔ VPS DB sync — strategy decision

## Problem

User có 2 môi trường: Vercel (Turso prod) + VPS (SQLite local). VPS giai đoạn này test/staging, sẽ thành **offline production** sau cho ngân hàng (Agribank không cho dùng cloud).

**Câu hỏi:** Có nên auto-sync 2 DB này không?

## Bối cảnh quan trọng (qua interview)

| | |
|---|---|
| VPS purpose | Future offline production (Agribank requirement) |
| Source of truth hiện tại | Turso (Vercel) |
| Tần suất edit | Daily, vài KH/loan/ngày |
| Pain | "Sợ data 2 nơi lệch" + **VPS có data riêng không có ở Turso** |

**Critical insight:** VPS edit data ĐỘC LẬP với Turso → KHÔNG PHẢI mirror, mà là 2 DB song song với data overlapping nhưng không identical.

## Approaches evaluated

### Option 1 — Auto-sync cron daily (Turso → VPS)

- **Pros:** zero manual work
- **Cons:** schema drift fail nửa đêm không ai biết; cần monitoring stack; **destructive với VPS data riêng**
- **Verdict:** ❌ Over-engineer + dangerous

### Option 2 — Manual snapshot per session (current shipped)

- **Pros:** simple, on-demand, KISS
- **Cons:** **CURRENT IMPLEMENTATION DESTRUCTIVE — wipes VPS unique data on import**
- **Verdict:** ✅ keep approach + ⚠ add safety guard

### Option 3 — Share Turso (bỏ VPS local DB)

- **Pros:** zero sync
- **Cons:** defeats VPS offline-test purpose; phụ thuộc Turso uptime + NordVPN/Tailscale path
- **Verdict:** ❌ wrong fit cho future-offline scenario

## Decision

**Keep Option 2 (manual snapshot) + add safety guards:**

1. **Compare tool** (`scripts/compare-turso-vps-counts.js`)
   - Pre-import diagnostic: show row count delta giữa Turso + VPS local
   - Highlight tables có rows unique chỉ ở VPS (will be lost if import)
   - Run trước mỗi import

2. **Import safety guard** (modify `scripts/import-snapshot-to-sqlite.js`)
   - Default: scan target DB, count rows per shared table
   - Refuse import if target có ≥ 1 row không có trong source (by primary key)
   - `--force` flag để override (bypass safety, nuke target tables)
   - `--merge` flag (TODO future) — UPSERT thay vì DROP+CREATE, preserve unique target rows

3. **Workflow discipline (rules, không phải code):**
   - Turso = canonical for shared/prod-like data
   - VPS = playground for transitional VPS-specific test data
   - Tag VPS-only data với code prefix `vps-test-*` để dễ identify (optional convention)
   - Trước import: chạy compare, backup VPS DB nếu có VPS-unique data đáng giữ

## Implementation considerations

| Item | Effort | Priority |
|---|---|---|
| `compare-turso-vps-counts.js` | 30min | HIGH (user requested) |
| Safety guard in import script | 30min | HIGH (prevents data loss) |
| `--merge` mode (UPSERT) | 2-3h | LOW (defer until needed) |
| Cron auto-sync | N/A | rejected |

## Risks / future watchouts

- **Schema migration drift:** Turso đi trước 1 migration mà VPS chưa pull → import fail. Mitigation: doc đã ghi run `prisma migrate deploy` trước import.
- **PII keys mismatch:** VPS thiếu `ENCRYPTION_KEY` đúng → KH info garbled. Doc đã ghi.
- **VPS-unique data accumulation:** càng nhiều VPS-only data, càng khó refresh từ Turso. Định kỳ cleanup hoặc namespacing.
- **Shift to offline production:** khi Agribank deploy thật, VPS data sẽ trở thành canonical → flip source of truth, Turso retire. Sync workflow này chỉ phù hợp transitional period.

## Success metrics

- Số lần data loss accidents = 0 (vs current risk: high)
- Compare tool runs < 5s
- Import safety guard không false-positive (không refuse khi VPS thực sự empty)

## Next steps

1. Implement `compare-turso-vps-counts.js`
2. Modify `import-snapshot-to-sqlite.js` thêm safety guard + `--force` flag
3. Update `docs/turso-vps-snapshot-sync.md` ghi workflow mới (compare → backup → import)
4. Defer auto-sync cron — không cần cho transitional period

## Unresolved questions

- Chiến lược khi VPS thành production thật: data Turso lúc đó có giữ không, hay snapshot final + tắt Turso?
- VPS-only data tagging convention: dùng prefix string `vps-test-*` hay column flag? (defer)
