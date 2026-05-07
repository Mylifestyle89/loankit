---
title: Turso ↔ VPS snapshot sync
description: Portable SQLite snapshot workflow để clone data Turso prod sang VPS offline.
created: 2026-05-07
---

# Turso ↔ VPS snapshot sync

One-way snapshot clone Turso prod → VPS offline. Per-session refresh, không merge ngược.

## What's included / excluded

| Included | Excluded |
|---|---|
| `customers` + relations (loans, beneficiaries, disbursements, invoices, collaterals, loan_plans, co_borrowers, related_persons, credit_*) | `user`, `session`, `account`, `twoFactor`, `verification` (auth — VPS có user riêng) |
| Globals: `field_template_masters`, `loan_plan_templates`, `loan_products`, `branches`, `dropdown_options`, `report_configs`, `app_notifications`, `loan_report_exports`, `migration_states` | `_prisma_migrations` (Prisma internal — VPS có history riêng) |

## Files

- `scripts/export-turso-snapshot.js` — dumps Turso → `.sql` file
- `scripts/compare-turso-vps-counts.js` — pre-import diagnostic: row count delta + unique-ID detection
- `scripts/import-snapshot-to-sqlite.js` — restores `.sql` → local SQLite via better-sqlite3 (with safety guard)
- (alt) `sqlite3 <target.db> < <snapshot.sql>` — nếu VPS có sqlite3 CLI (BYPASSES safety guard)

## Workflow

### 1. Export from Turso (máy có credentials)

```powershell
# Dry-run kiểm tra (list tables + row counts, không write file)
node scripts/export-turso-snapshot.js --dry-run

# Export full snapshot → backups/turso-snapshot-<timestamp>.sql
node scripts/export-turso-snapshot.js

# Custom output path
node scripts/export-turso-snapshot.js --out backups/turso-2026-05-07.sql

# Restrict to specific tables (debug)
node scripts/export-turso-snapshot.js --tables customers,loans
```

### 2. Transfer file lên VPS

`.sql` file portable. Copy qua `scp`/USB/Tailscale. Kích thước ước lượng: ~10-50KB per customer (full relations) + globals.

### 3. Restore trên VPS

**3a. Prep target DB:**
```powershell
# Trên VPS — tạo schema sạch (auth tables từ Prisma migrations)
npx prisma migrate deploy
```

**3b. Compare TRƯỚC import (mandatory check):**
```powershell
npm run snapshot:compare
# Hoặc target khác: node scripts/compare-turso-vps-counts.js --target vps.db
```
Output sẽ list mỗi bảng có Turso count vs local count + cảnh báo nếu có rows local-only sẽ bị destroyed.

**3c. Backup nếu có local-unique rows đáng giữ:**
```powershell
Copy-Item dev.db dev.db.backup-$(Get-Date -Format yyyyMMdd-HHmm)
```

**3d. Apply snapshot (chọn 1 cách):**

```powershell
# Cách A: better-sqlite3 (KHUYẾN NGHỊ — có safety guard)
npm run snapshot:import -- backups/turso-snapshot-...sql dev.db
# Nếu có local-unique rows, script sẽ REFUSE. Override:
npm run snapshot:import -- backups/turso-snapshot-...sql dev.db --force

# Cách B: sqlite3 CLI (BYPASSES safety guard — chỉ dùng khi chắc chắn)
sqlite3 dev.db < backups/turso-snapshot-....sql
```

### 4. Verify VPS app

```powershell
# Copy .env.local (incl. ENCRYPTION_KEY) từ máy gốc
# Start app
npm run dev

# Login bằng admin user của VPS (KHÔNG phải user Turso — đã skip)
```

## ⚠ Critical gotchas

### ENCRYPTION_KEY phải khớp

PII columns (`customer_code_hash`, `email_enc`, `cccd_enc`, etc.) lưu **encrypted**. VPS phải có cùng `ENCRYPTION_KEY` env var với Turso prod, nếu không decrypt fail → KH info hiện garbled.

Memory `project_pii_migration_completed.md` mô tả ENCRYPTION_KEY shell one-liner để generate consistent key.

### Auth users không sync

VPS quản auth user riêng. Sau snapshot import:
- Customer data có `createdById` trỏ tới user ID Turso → user đó có thể không tồn tại trên VPS
- `CustomerGrant.userId` tương tự
- Behavior: Prisma không enforce FK với SQLite, các orphan IDs vẫn lưu nhưng UI sẽ thấy "Unknown user"
- Workaround: tự tạo admin VPS với cùng email, hoặc accept "Unknown" cho `createdBy` view

### MasterTemplate config

Phase 6 master-centric: mapping/alias/formulas trong `field_template_masters.{defaultMappingJson, defaultAliasJson, formulasJson}`. Snapshot include đầy đủ → VPS render báo cáo hoạt động bình thường.

### Schema drift

Snapshot include CREATE TABLE statements. Nếu VPS schema (qua `prisma migrate deploy`) khác Turso schema (vd Turso đi trước 1 migration chưa apply VPS), import sẽ fail ở DROP TABLE / CREATE TABLE conflict.

**Best practice:** Đảm bảo VPS chạy `prisma migrate deploy` trước import, version code khớp (cùng git commit).

### File size

Customer + relations: ~10-50KB per KH. Globals: ~50KB-2MB tùy template count. Snapshot 100 KH cỡ 5-10MB. Acceptable cho transfer thủ công.

Streaming nếu DB lớn (1000+ KH): chưa support, để TODO.

## Frequency

- Manual on-demand: trước khi đi offline (VPS standalone session)
- Hoặc cron VPS pull mỗi đêm khi online
- KHÔNG dùng cho real-time sync (đây là snapshot workflow)

## Failure modes & recovery

| Symptom | Cause | Fix |
|---|---|---|
| `no such table: <name>` | VPS thiếu Prisma migrations | `prisma migrate deploy` rồi import lại |
| `UNIQUE constraint failed` | Target DB có data conflict với snapshot | Drop target DB hoặc dùng fresh target |
| KH info "garbled" trong UI | ENCRYPTION_KEY mismatch | Copy key từ máy gốc, restart app |
| `cannot open file` import | Snapshot path sai | Dùng absolute path |
| `_prisma_migrations` mismatch warnings | Snapshot không export Prisma history | Bình thường, ignore |

## Roll-back

Snapshot là portable file → roll-back chỉ cần restore từ snapshot cũ:
```powershell
node scripts/import-snapshot-to-sqlite.js backups/turso-snapshot-OLD.sql dev.db
```

Vẫn nên backup VPS DB trước import:
```powershell
Copy-Item dev.db dev.db.backup-$(Get-Date -Format yyyyMMdd-HHmm)
```
