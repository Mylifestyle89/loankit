# Contract: Collateral Module (Tài sản bảo đảm — TSBĐ)

> **Status:** draft
> **Owner:** Quân
> **Last updated:** 2026-04-15
> **Related schemas:** `src/app/report/customers/[id]/components/collateral-config.ts`, `src/services/khcn-builder-collateral-*.ts`, `prisma/schema.prisma` (Collateral)
> **Cross-references:**
> - [customer.contract.md](customer.contract.md) — Collateral thuộc Customer (cascade delete)
> - [loan-and-plan.contract.md](loan-and-plan.contract.md) — §5.4 `selectedCollateralIds` JSON array trên Loan

---

## 1. Purpose

Quản lý tài sản bảo đảm (TSBĐ) thuộc về Customer. Loan liên kết tới subset TSBĐ qua `Loan.selectedCollateralIds` (JSON). Multi-type (4 loại), multi-owner (tài sản đứng tên nhiều người), type-specific fields lưu trong `properties_json` không cần migration khi thêm field.

> **⚠️ Contract mô tả current code.** Target rules mark `⚠️ NOT YET IMPLEMENTED`.

---

## 2. Entities & Relations

```
Customer
  └── has many → Collateral
                   ├── belongs to → Customer (cascade)
                   ├── collateral_type (4 values, xem §3)
                   ├── properties_json — type-specific fields
                   │    └── _owners array — multi-owner nested
                   └── linked loans (inverse, via Loan.selectedCollateralIds JSON)
```

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `customerId` | String | ✅ | FK cascade |
| `collateral_type` | String | ✅ | enum 4 values (xem §3) |
| `name` | String default `""` | — | Tên TSBĐ (hiển thị) |
| `total_value` | Float? | ❌ | VND, tổng giá trị TS |
| `obligation` | Float? | ❌ | VND, nghĩa vụ bảo đảm |
| `properties_json` | String (JSON) | ✅ default `{}` | Type-specific fields (xem §4.2) |

**Không có `status` field** — Collateral không có state machine. Xóa = soft delete (target).

---

## 3. `collateral_type` Enum (4 values)

Reference: `COLLATERAL_TYPES` trong `collateral-config.ts`.

| Value | Label | Type-specific fields (trong `properties_json`) |
|---|---|---|
| `qsd_dat` | Bất động sản | `land_area`, `construction_area`, `floor_area`, `house_structure`, `floors`, `ownership_form`, `land_origin`, `land_address`, `lot_number`, `map_number`, `appraisal_purpose`... |
| `dong_san` | Động sản (Phương tiện GT) | `vehicle_plate`, `engine_number`, `chassis_number`, `vehicle_brand`, `color`, `manufacture_year`, `seats`, `registration_number`... |
| `tiet_kiem` | Cầm cố TTK / Giấy tờ có giá | `card_number`, `issued_date`, `face_value`, `interest_rate`, `maturity_date` (dùng registry camco riêng) |
| `tai_san_khac` | Tài sản khác | Free-form fields |

**Camco templates** dùng registry riêng (`khcn-camco-template-registry.ts`) vì có workflow hơi khác TSBĐ thông thường.

---

## 4. Business Rules

### 4.1 `properties_json` Extension Pattern

Follows repo-wide JSON extension checklist — xem `docs/contracts/README.md` §8.5.

Key difference so với `data_json/financials_json`: schema khác theo `collateral_type`. Khi thêm field type-specific:
1. Zod: inline trong API route, discriminated theo collateral_type (hoặc 1 loose schema với passthrough)
2. Type: `CollateralItem` trong `collateral-config.ts`
3. Persistence: `customer.service.ts` `handleCollaterals` 
4. UI: `collateral-*.tsx` form components

**⚠️ NOT YET IMPLEMENTED:** Zod schema per `collateral_type` (discriminated union). Hiện free-form → typo key silent.

### 4.2 Multi-Owner Pattern (`_owners`)

Nested array trong `properties_json._owners`:
```ts
_owners: OwnerEntry[] = [
  {
    name: string,
    id_type: string,  // CCCD/CMND/Hộ chiếu
    cccd: string,
    cccd_place: string,
    cccd_date: string,
    cmnd_old: string,
    birth_year: string,
    address: string,
    current_address: string,
    phone: string,
  }, ...
]
```

**Rules:**
- `_owners[0]` = primary owner, fallback to top-level `owner_name` field nếu `_owners` rỗng
- Template multi-owner: builder loop qua `_owners` array để render multiple rows

### 4.2.1 PII Encryption cho `_owners` ⚠️ NOT YET IMPLEMENTED — HIGH PRIORITY (Compliance)

**Risk:** `cccd`, `phone`, `current_address` trong `_owners` hiện plain text trong `properties_json` column. Agribank security scan quét DB sẽ flag → compliance violation.

**Target approach — 2 options:**

| Option | Pros | Cons |
|---|---|---|
| **A. Promote `_owners` → table `CollateralOwner`** với PII columns encrypted giống `CoBorrower` | Clean separation, query được theo owner, consistent với CoBorrower pattern | Cần DB migration, refactor builder + UI |
| **B. Encrypt toàn bộ `_owners` JSON string** trước khi save vào `properties_json` | Nhanh, không migration | Mất khả năng query nested fields trong SQL |

**Recommended: Option B** — Loankit không search owner theo CCCD, quy mô nhỏ. Tốc độ implement nhanh hơn. Nếu sau này cần search → migrate sang Option A.

**Implementation sketch (B):**
- Trước save: `properties_json._owners = encryptField(JSON.stringify(_owners))`
- Sau load: decrypt string → parse JSON → expose array
- Thêm helper `encryptCollateralOwners()`, `decryptCollateralOwners()` trong `field-encryption.ts`

### 4.3 Owner Type: Bên Vay vs Bên Thứ 3 (BT3)

Phân biệt qua `relationship` field trong owner hoặc top-level:
- Bên vay: customer chính vay, đồng thời sở hữu TSBĐ
- BT3: TSBĐ đứng tên người khác (cha, mẹ, con, ...) — phải có cam kết riêng

Template registry có sets riêng cho BT3 (`*_bt3.docx`), dùng khi owner không phải customer.

### 4.4 Loan Linking via `selectedCollateralIds`

- Loan tham chiếu TSBĐ qua JSON array: `Loan.selectedCollateralIds: "[\"id1\",\"id2\"]"`
- Empty `"[]"` → Loan dùng TẤT CẢ collaterals của customer khi xuất report
- Không FK DB — orphan IDs silent filter trong builder
- Xem [loan-and-plan contract](loan-and-plan.contract.md) §5.4

### 4.5 Valuation Rounding

- `total_value` và `obligation` có thể được round theo rule `round_to_thousand_vnd` trước khi save (tùy UI)
- Khi import từ BK (bảng kê): land details có `round_to_thousand` helper

### 4.6 `noClone` Flag cho DOCX Loop

Khi 1 Loan có >1 TSBĐ cùng loại:
- Template DOCX dùng loop `[#TSBD]...[/TSBD]` render list
- `noClone` flag trong builder = dùng loop thay vì clone toàn bộ DOCX section
- Giảm file size + giữ format đồng nhất

### 4.7 Data Integrity Strategy

Giống pattern từ các modules khác:
- **CẤM** raw `prisma.collateral.*` — MUST qua customer service (`handleCollaterals`)
- **CẤM** mutate `properties_json` trực tiếp, phải merge qua service

**Service MUST validate:**
- `total_value ≥ 0`
- **⚠️ NOT YET IMPLEMENTED:** `obligation ≤ total_value` — nghĩa vụ bảo đảm vượt giá trị TS là phi logic nghiệp vụ. Hiện chỉ warn ở UI, có thể bypass qua API call trực tiếp. Target: throw error rõ ràng ở service layer trước save.

### 4.8 Soft Delete

Follows repo-wide convention — xem `docs/contracts/README.md` §8.1.

Lưu ý: khi soft delete Collateral, update `Loan.selectedCollateralIds` của các loans liên kết để loại bỏ ID này (hoặc rely on silent filter). **⚠️ NOT YET IMPLEMENTED** — current hard delete.

---

## 5. Permissions

| Action | admin | editor | viewer |
|---|:-:|:-:|:-:|
| List collaterals | ✅ | ✅ | ✅ |
| View detail | ✅ | ✅ | ✅ |
| Create / Update | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Bulk import (BK) | ✅ | ✅ | ❌ |

---

## 6. Validation

Inline Zod trong `src/app/api/customers/[id]/collaterals/**` API routes + service layer `customer.service.ts`.

**⚠️ NOT YET IMPLEMENTED:** Discriminated Zod schema theo `collateral_type` — hiện 1 loose schema với `properties_json` free-form.

---

## 7. API Contract

### Response format (repo-wide, xem README §8.4)
```json
{ "ok": true, "collaterals": [...] }
{ "ok": true, "collateral": {...} }
{ "ok": false, "error": "..." }
```

### Endpoints

Collateral luôn nested dưới Customer (không có top-level `/api/collaterals`):

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/customers/[id]/collaterals` | session | List all cho customer |
| POST | `/api/customers/[id]/collaterals` | editor+ | Create |
| GET | `/api/customers/[id]/collaterals/[collateralId]` | session | Detail |
| PATCH | `/api/customers/[id]/collaterals/[collateralId]` | editor+ | Update |
| DELETE | `/api/customers/[id]/collaterals/[collateralId]` | admin | Delete (soft, target) |

---

## 8. Edge Cases & Decisions

| Situation | Decision |
|---|---|
| Xóa Customer có Collaterals | Cascade (Prisma onDelete: Cascade) → target: service cascade soft delete |
| Xóa Collateral đang linked ở Loan | Silent filter trong builder (`selectedCollateralIds` giữ orphan ID). Target: update luồng clean |
| `_owners` rỗng nhưng có `owner_name` top-level | Builder fallback: `_owners[0]?.name ?? owner_name ?? ""` |
| Multi-owner TSBĐ với 5+ owners | Template render loop; nếu template không support → chỉ render `_owners[0]` |
| `total_value = null` | Báo cáo hiển thị "—"; builder skip field |
| Collateral không thuộc loan method nào | Vẫn tồn tại, xuất hiện trong "Tất cả TSBĐ" của customer |
| `properties_json` parse fail | Fallback `{}`, không crash — loss type-specific data (silent) |
| `obligation > total_value` | **⚠️ NOT YET ENFORCED.** Warn-only ở UI. Target: block ở service (§4.7) — nghĩa vụ vượt giá trị TS là phi logic tín dụng |
| Import BK land: diện tích không round | Auto-round `total_value` qua `round_to_thousand_vnd` nếu flag bật |

---

## 9. Open Questions

### Deferred refactors (trigger-based)

- **Discriminated Zod per `collateral_type`** — deferred. **Trigger:** khi thêm type thứ 5+, hoặc phát hiện bug thực do typo key trong `properties_json`.
- **Migrate `_owners` sang table riêng (Option A §4.2.1)** — deferred. **Trigger:** cần query owner theo CCCD, hoặc >10 owners/collateral thành bottleneck. Hiện dùng Option B (encrypt JSON string) là đủ.

### Undecided

- [ ] Auto update `Loan.selectedCollateralIds` khi delete Collateral — batch update các loans liên kết, hay silent filter?
- [ ] Camco templates: có nên merge vào chung registry thay vì riêng không?
- [ ] `properties_json` có index được không? (Hiện không — slow nếu search nested field)

---

> **How to use this contract:** Xem `docs/contracts/README.md` §4 cho workflow sửa rule.
