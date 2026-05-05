# Brainstorm — Hoàn thiện Module Báo Cáo Đề Xuất Doanh Nghiệp

**Date**: 2026-05-05 10:07
**Scope**: Lock data model + lộ trình refactor module KHDN report
**Status**: Phase 0 (data model lock), chưa code

---

## 1. Vấn đề

Module báo cáo đề xuất DN build khi user còn chưa rõ structure → tích nhiều bug:

- ✅ Data nhập tay biến mất khi đổi customer/instance
- ✅ Repeater (bảng lặp) bị reset
- ✅ Placeholder không fill / fill sai field
- ✅ Mất draft sau deploy / restart Vercel

Deploy target: **cả Vercel + VPS offline** → DB phải là source of truth.

---

## 2. Gốc rễ — 3 cấp data, schema hiện không phản ánh đúng

| Cấp | Ví dụ | Hiện đang lưu |
|---|---|---|
| **Master template** (per loại DN + loại báo cáo) | CTCP-BCDX, TNHH1TV-BCDX | `FieldTemplateMaster` (thiếu `companyType`, `reportKind`) |
| **Customer profile** (shared mọi hồ sơ) | Pháp lý DN, tài chính | ❌ Chưa có chỗ — lẫn vào `MappingInstance` |
| **Loan dossier** (mỗi bộ hồ sơ vay) | HMTD KD, Vay TDH mua xe | ❌ `MappingInstance` đang ôm cả nhưng tên gây hiểu lầm |

**Phát hiện quan trọng**: Đã có sẵn 3 model Loan/LoanPlan/Disbursement — chính là tầng "dossier". Không cần tạo bảng mới, chỉ cần **kết nối Loan vào MasterTemplate + tách values cho đúng cấp**.

### Storage chồng chéo (gốc rễ "mất data")

| Thứ | Lưu ở đâu | Vấn đề |
|---|---|---|
| Mapping (placeholder→path) | DB `MappingInstance.mappingJson` + file `mappingJsonPath` | Dual-write, lệch khi 1 nơi fail |
| Alias map | DB `aliasJson` + file | Như trên |
| Field catalog | `MappingInstance.fieldCatalogJson` **VÀ** `FieldTemplateMaster.fieldCatalogJson` | 2 nguồn truth, sync sai → fill sai field |
| **Manual values** | **1 file JSON GLOBAL** `report_assets/manual_values.json` | **Không gắn customer/loan → đè data lẫn nhau** ⚠ |
| Build flat output | File `report_assets/generated/report_draft_flat.json` | Vercel read-only swallow EROFS → mất sau restart |
| Build pipeline | **Python script `run_pipeline.py`** | 🚨 Vercel không có Python runtime mặc định |

---

## 3. Schema đề xuất (DB-first)

### Bảng MỚI / SỬA

```
MasterTemplate  (rename từ FieldTemplateMaster)
├─ companyType    (CTCP|TNHH1TV|TNHH2TV|HKD|CN_individual)   ← MỚI
├─ reportKind     (BCDX|GiayNhanNo|DanhMucHoSo|UNC|...)      ← MỚI
├─ docxPath       (FS read-only, OK Vercel)
├─ placeholderSchemaJson  (canonical, sinh từ parse .docx)   ← canonical, source of truth
├─ defaultMappingJson
├─ defaultAliasJson
└─ fieldCatalogJson   (canonical duy nhất — bỏ field này khỏi instance)

Customer  (đã có, THÊM field)
└─ customerProfileValuesJson   ← MỚI: pháp lý + tài chính (SHARED mọi loan)

Loan  (đã có, THÊM 2 fields)
├─ masterTemplateId            ← MỚI: chọn template nào cho hồ sơ này
├─ dossierValuesJson           ← MỚI: phương án vay (RIÊNG mỗi loan)
├─ mappingOverrideJson?        ← MỚI nullable: override mapping nếu cần
└─ exportedDocxBlobRef?        ← MỚI: R2/S3 key lưu DOCX đã export
```

### Bảng XOÁ / DEPRECATE

- `MappingInstance` → split data:
  - Mapping/alias customize → đẩy vào `Loan.mappingOverrideJson` (nếu có) hoặc về MasterTemplate
  - `customerId` link → giữ, đổi sang `Loan.masterTemplateId`
  - Sau migration: drop bảng
- `manual_values.json` global → xoá hẳn, data về `Customer.customerProfileValuesJson` + `Loan.dossierValuesJson`
- `report_draft_flat.json` → bỏ, build in-memory mỗi lần export
- `mapping_versions/` filesystem → DB only

### Quan hệ

```
MasterTemplate (1) ─────┬─< Loan (N)
   companyType          │   dossierValuesJson
   reportKind           │   mappingOverrideJson?
   placeholderSchema    │
                        └─ customerId → Customer
                                          customerProfileValuesJson
                                          companyType (đã có: organization_type)
```

### Fill flow MỚI

```
GET /api/report/loan/{loanId}/preview-data
  ↓
1. Load Loan + Customer + MasterTemplate + LoanPlan(s)
2. Merge values:
     base = MasterTemplate.defaultMapping
     mapping = base ⊕ Loan.mappingOverrideJson  (deep merge)
     values = Customer.customerProfileValues ⊕ Loan.dossierValues ⊕ derivedFromLoan/LoanPlan
3. Resolve qua mapping + alias → flat data
4. docxtemplater render in-memory
5. Stream DOCX về client (KHÔNG ghi FS)
6. Optional: upload R2/S3 → save blobRef vào Loan.exportedDocxBlobRef
```

---

## 4. Lộ trình 5 phase

| Phase | Mục tiêu | Effort | Bug fix |
|---|---|---|---|
| **0. Lock data model** ← ĐANG | ERD + migration plan, duyệt | 1-2 ngày | (foundation) |
| **1. Migrate data layer** | Schema mới, migration script, bỏ dual-write | 3-5 ngày | ✅ Mất draft, ✅ đè data |
| **2. Auto-save + recovery** | Debounced 500ms, optimistic lock, UI restore | 2-3 ngày | ✅ Mất data nhập tay |
| **3. Build in-memory + port pipeline** | Bỏ flat.json, port Python→TS, stream DOCX | 3-5 ngày | ✅ Vercel restart, ✅ repeater reset |
| **4. Validation + coverage** | Coverage realtime, chặn export khi thiếu | 1-2 ngày | ✅ Placeholder fill sai |
| **5. Builder polish** | Override UI, validate khi upload .docx | 3-5 ngày | (UX power user) |

**Total**: ~13-22 ngày. Mỗi phase ship được độc lập.

---

## 5. Migration plan (cho Phase 1, plan ở Phase 0)

### Bước an toàn

1. **Backup**: dump full DB + zip `report_assets/` trước migration
2. **Add columns** (non-breaking): thêm các field mới với default `null`/`{}`. Code cũ vẫn chạy.
3. **Backfill script** (TS, idempotent):
   - Quét tất cả `MappingInstance` → identify customer + master template
   - Move `mappingJson`/`aliasJson` về `Loan.mappingOverrideJson` nếu khác default master
   - Parse `manual_values.json` → match key prefix (vd `customer_*` vào customer profile, `dossier_*`/`loan_*` vào dossier)
   - **Unmatched keys → log file `migration-orphans.json`** để review thủ công
4. **Dual-read period** (1 tuần): code đọc cả nguồn cũ + mới, ưu tiên mới
5. **Dual-write off**: chỉ ghi nguồn mới
6. **Drop**: xoá bảng `MappingInstance`, file legacy

### Risk

- **manual_values.json không có metadata customer/loan** → backfill có thể attribute sai. Mitigation: log orphans + UI warning "data này chưa được gán hồ sơ, vui lòng review".
- **Python pipeline still running**: Phase 3 phải port. Trong lúc chuyển: keep Python cho VPS, in-memory TS cho Vercel — flag `BUILD_ENGINE=python|ts`.

---

## 6. Đề xuất Phase 1 detail (preview)

### File phải sửa

- `prisma/schema.prisma` — add fields, rename model
- `src/services/report/mapping.service.ts` — bỏ FS write, chỉ DB
- `src/services/report/build.service.ts` — bỏ `manual_values.json`, đọc từ DB
- `src/lib/report/manual-values.ts` — DEPRECATE, thay bằng service đọc Customer/Loan
- `src/services/report/_migration-internals.ts` — viết migration script
- `src/app/report/khdn/mapping/stores/*` — Zustand stores: state shape mới (customerProfile + dossier)

### File MỚI

- `scripts/migrate-report-data.ts` — backfill idempotent
- `src/services/report/values.service.ts` — CRUD customerProfileValues + dossierValues
- `prisma/migrations/{date}_report_module_v2/migration.sql`

---

## 7. Success criteria

- ✅ Đổi customer/loan → data không lẫn lộn
- ✅ Repeater data persistent qua build cycle
- ✅ Vercel deploy không mất draft
- ✅ Coverage report cảnh báo placeholder thiếu trước export
- ✅ 1 nguồn truth duy nhất cho mapping/alias/values
- ✅ DOCX output không phụ thuộc FS write

---

## 8. Decisions đã chốt với user

| Quyết định | Chốt |
|---|---|
| Customer customize giữa loại DN | Khác file `.docx` gốc (mỗi loại = 1 MasterTemplate) |
| 1 customer có nhiều hồ sơ vay | Có — link qua bảng `Loan` đã tồn tại |
| Phase bắt đầu | Phase 0 — lock data model trước |
| Data cũ | Cố gắng migrate, log orphans |
| Deploy target | Vercel + VPS offline → DB là source of truth |

---

## 9. Final decisions (Phase 0 closed)

| # | Quyết định |
|---|---|
| 1 | **Storage DOCX**: FS local trên VPS (`report_assets/exports/{loanId}/`), stream-only trên Vercel |
| 2 | **Python pipeline**: port toàn bộ sang TS, 1 engine duy nhất. Bỏ `run_pipeline.py`. |
| 3 | **mappingOverride**: BỎ ở Loan level. Chỉ **field-level value override** (user sửa giá trị tại chỗ trên form). Mapping cố định ở MasterTemplate. |
| 4 | **LoanPlan vs dossierValues**: tách rõ — LoanPlan = structured (cost_items/revenue), `Loan.dossierValuesJson` = free-form fields khác trong template |
| 5 | **Audit trail**: giữ N=5 bản gần nhất, auto-rotate. Bảng `LoanReportExport` record metadata + path. |

### Schema FINAL

```
MasterTemplate  (rename FieldTemplateMaster, +companyType, +reportKind, +placeholderSchemaJson)

Customer  (+customerProfileValuesJson)

Loan  (+masterTemplateId, +dossierValuesJson, +exportedDocxBlobRef?)
       — KHÔNG có mappingOverrideJson (đã bỏ)

LoanReportExport  (MỚI — audit trail rotate-5)
├─ id, loanId, exportedAt, exportedBy
├─ docxPath  (FS) HOẶC stream-only (Vercel: row chỉ ghi metadata)
├─ valuesSnapshot  (JSON — reproducibility)
└─ status (active|rotated_out)

XOÁ: MappingInstance, manual_values.json, report_draft_flat.json, run_pipeline.py
```

### Auto-rotate logic (LoanReportExport)

```
Khi insert export mới cho 1 Loan:
  1. INSERT bản mới
  2. SELECT exports của loan ORDER BY exportedAt DESC OFFSET 5
  3. DELETE rows + unlink files cho rotated_out
```
