# Contract: Disbursement + Beneficiary Module (Giải ngân)

> **Status:** draft
> **Owner:** Quân
> **Last updated:** 2026-04-16
> **Related schemas:** `src/services/disbursement.service.ts`, `prisma/schema.prisma` (Disbursement, DisbursementBeneficiary, Beneficiary)
> **Cross-references:**
> - [invoice.contract.md](invoice.contract.md) — §4.1 (virtual invoice generation từ beneficiary pending/supplementing)
> - [loan-and-plan.contract.md](loan-and-plan.contract.md) — §5.2 (`the_loc_viet` hide disbursement flow)
> - [auth-and-notification.contract.md](auth-and-notification.contract.md) — Cron supplement deadline check

---

## 1. Purpose

Quản lý giải ngân từ khoản vay đã phê duyệt: tạo lần giải ngân, phân bổ cho các đơn vị thụ hưởng (beneficiaries), theo dõi hóa đơn chứng minh mục đích sử dụng vốn theo từng beneficiary line.

> **⚠️ Contract mix current + target state.** Các sections có marker `⚠️ NOT YET IMPLEMENTED` mô tả target behavior (chưa trong code). Implementation plan: xem `plans/{date}-contract-target-rules/`.

---

## 2. Entities & Relations

```
Loan
  └── has many → Disbursement
                   ├── belongs to → Loan
                   ├── has many → DisbursementBeneficiary (snapshot của beneficiary)
                   │                ├── links to → Beneficiary (soft link qua beneficiaryId, nullable)
                   │                └── has many → Invoice
                   └── has many → Invoice (fallback, không gắn beneficiary line)
```

### Key Fields

| Entity | Field | Type | Required | Notes |
|---|---|---|---|---|
| Disbursement | loanId | String | ✅ | FK → Loan, cascade delete |
| Disbursement | amount | Float | ✅ | VND, > 0 |
| Disbursement | disbursementDate | DateTime | ✅ | Ngày giải ngân |
| Disbursement | status | String | ✅ | `active / completed / cancelled` |
| Disbursement | debtAmount | Float? | ❌ | Số tiền nhận nợ (có thể khác amount) |
| Disbursement | currentOutstanding | Float? | ❌ | Dư nợ tại thời điểm giải ngân (snapshot) |
| Disbursement | loanTerm + termUnit | Int + String? | ❌ | Thời hạn (tháng/ngày) |
| DisbursementBeneficiary | disbursementId | String | ✅ | FK cascade |
| DisbursementBeneficiary | beneficiaryId | String? | ❌ | Soft link, setNull khi xóa Beneficiary |
| DisbursementBeneficiary | beneficiaryName | String | ✅ | Snapshot tên |
| DisbursementBeneficiary | amount | Float | ✅ | Số tiền phân bổ |
| DisbursementBeneficiary | invoiceAmount | Float | ✅ | Tổng đã upload, default 0 |
| DisbursementBeneficiary | invoiceStatus | String | ✅ | `pending / supplementing / has_invoice / bang_ke` |

---

## 3. States

### Disbursement.status

```
active (default) ──┬──→ completed
                   └──→ cancelled
```

**Allowed transitions:**
| From | To | Who | Condition |
|---|---|---|---|
| `active` | `completed` | editor+ | Tất cả beneficiary lines đã `has_invoice` hoặc `bang_ke` |
| `active` | `cancelled` | editor+ | Bất kỳ thời điểm nào (ghi rõ lý do trong description) |

**Forbidden transitions:**
- ❌ `completed` → `active` / `cancelled` (terminal state)
- ❌ `cancelled` → `active` / `completed` (terminal state, muốn dùng lại phải tạo Disbursement mới)
- ❌ `completed` ↔ `cancelled` (không cross)

Terminal states để đảm bảo audit trail: không được "un-complete" hay "un-cancel". Sai thì soft-delete rồi tạo mới.

### DisbursementBeneficiary.invoiceStatus

| Status | Nghĩa | Chuyển đến |
|---|---|---|
| `pending` | Chưa upload hóa đơn nào | `supplementing` khi có invoice đầu tiên (auto by service) |
| `supplementing` | Có invoice nhưng chưa đủ amount | `has_invoice` khi `invoiceAmount >= amount` (auto) |
| `has_invoice` | Đủ hóa đơn (fully invoiced) | Terminal |
| `bang_ke` | Dùng bảng kê thay invoice chi tiết | Terminal, exclude khỏi invoice queries |

**Forbidden transitions:**
- ❌ `has_invoice` → `pending` / `supplementing` (không được reopen)
- ❌ `bang_ke` → bất kỳ state nào (terminal, set 1 lần)
- ❌ Manual downgrade (`supplementing` → `pending`): không cho phép xóa invoice rồi rollback status

---

## 4. Business Rules

### 4.1 Amount Rules
- `Disbursement.amount > 0`
- **`sum(DisbursementBeneficiary.amount) ≤ Disbursement.amount`** — IMPLEMENTED. `createBeneficiaryLines()` validates `existingSum + newSum ≤ disbursement.amount` inside transaction before creating lines.
- `invoiceAmount` cộng dồn khi upload invoice mới
- `invoiceAmount ≤ amount` per beneficiary line

### 4.2 Invoice Supplement Rules
- Mỗi beneficiary có deadline supplement = `disbursementDate + 1 tháng` (hàm `addOneMonthClamped`)
- Quá hạn supplement → cron notify qua email digest
- `bang_ke` status → bỏ qua invoice flow, không check deadline

### 4.3 Soft Link to Beneficiary Table
- `beneficiaryId` nullable, `onDelete: SetNull`
- `beneficiaryName/address/accountNumber/bankName` là snapshot — không auto sync khi Beneficiary gốc đổi

### 4.4 Virtual Invoice Generation
- Khi `invoiceStatus ∈ [pending, supplementing]` → sinh virtual invoice entry ở invoice-queries service
- Xem [invoice contract](invoice.contract.md) §4

### 4.5 Concurrency / Race Conditions

IMPLEMENTED. Validation runs inside `prisma.$transaction` — concurrent requests see consistent sum.

**Strategy:** **Optimistic + re-validate trong transaction**

```ts
// Pseudo code cho create/update beneficiary
await prisma.$transaction(async (tx) => {
  const current = await tx.disbursementBeneficiary.aggregate({
    where: { disbursementId },
    _sum: { amount: true },
  });
  const currentTotal = current._sum.amount ?? 0;
  const newTotal = currentTotal + newAmount;  // or - oldAmount + newAmount for update
  const disbursement = await tx.disbursement.findUnique({ where: { id: disbursementId } });
  if (newTotal > disbursement.amount) {
    throw new Error("Beneficiary total exceeds disbursement amount");
  }
  return tx.disbursementBeneficiary.create({...});
});
```

**Tại sao optimistic đủ:** Loankit scale nhỏ (≤ vài chục concurrent editors), xác suất conflict thấp. Pessimistic locking (`SELECT ... FOR UPDATE`) over-engineer ở phase này.

**Khi nào revisit:** Nếu có complaint về "sum vượt limit" trên production → chuyển sang pessimistic hoặc serializable isolation.

### 4.6 Soft Delete ⚠️ NOT YET IMPLEMENTED

Follows repo-wide convention — xem `docs/contracts/README.md` §8.1. Module-specific note:
- Xóa Loan → soft delete Disbursements tầng tầng (service cascade, không rely Prisma onDelete)
- Xóa Disbursement → soft delete DisbursementBeneficiary theo

---

## 5. Permissions

| Action | admin | editor | viewer |
|---|:-:|:-:|:-:|
| Tạo Disbursement | ✅ | ✅ | ❌ |
| Update Disbursement | ✅ | ✅ | ❌ |
| Delete Disbursement | ✅ | ❌ | ❌ |
| CRUD DisbursementBeneficiary | ✅ | ✅ | ❌ |
| List / View | ✅ | ✅ | ✅ |
| Upload invoice cho line | ✅ | ✅ | ❌ |

---

## 6. Validation

Zod schemas inline trong API routes + service layer:
- `src/app/api/loans/[id]/disbursements/route.ts` (POST body)
- `src/app/api/loans/[id]/disbursements/[disbursementId]/route.ts` (PATCH body)

Không có file schema tập trung — rải trong services.

---

## 7. API Contract

### Response format
```json
{ "ok": true, "disbursements": [...] }        // success
{ "ok": false, "error": "message" }           // failure
```

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/loans/[id]/disbursements` | session | List paginated, filter status + search |
| POST | `/api/loans/[id]/disbursements` | editor+ | Create disbursement |
| GET | `/api/loans/[id]/disbursements/[disbursementId]` | session | Detail |
| PATCH | `/api/loans/[id]/disbursements/[disbursementId]` | editor+ | Update |
| DELETE | `/api/loans/[id]/disbursements/[disbursementId]` | admin | Delete |
| GET/PATCH | `/api/disbursements/[id]` | session/editor | Alt access |

Beneficiary modal quản lý DisbursementBeneficiary qua `/api/disbursements/[id]` PATCH (nested body).

---

## 8. Edge Cases & Decisions

| Situation | Decision |
|---|---|
| Xóa Loan có Disbursements | Soft delete tầng tầng (service layer cascade set `deletedAt`, không rely Prisma onDelete) |
| Xóa Beneficiary gốc | SetNull `beneficiaryId` trên DisbursementBeneficiary, snapshot fields giữ nguyên |
| Tổng beneficiary amount > disbursement amount | Enforced at service layer — validates inside transaction before create (§4.1, §4.5) |
| `bang_ke` beneficiaries trong invoice queries | Exclude via `EXCLUDE_BANG_KE_INVOICES` clause |
| Virtual invoice id format | `virtual-{beneficiaryId}` — không phải UUID, không query Prisma trực tiếp |
| Cron scan supplement deadlines | Dedup key: `{type}:supplement-{beneficiaryId}` (khác real invoice key) |

---

## 9. Open Questions

- [ ] Supplement deadline (1 tháng) nên configurable per loan_method?
- [ ] Có cần audit log cho mọi update Disbursement/Beneficiary không? (Ngoài soft delete)
- [ ] Cron job cleanup hard-delete soft-deleted records cũ hơn N năm? (Nếu cần tuân thủ data retention)
- [ ] Transition `supplementing → has_invoice` hiện tại implement ở đâu — verify service có auto-update không, hay cần job riêng

---

> **How to use this contract:** Xem `docs/contracts/README.md` §4 cho workflow sửa rule.
