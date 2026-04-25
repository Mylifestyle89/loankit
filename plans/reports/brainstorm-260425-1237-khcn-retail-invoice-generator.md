# Brainstorm — KHCN Retail Invoice Generator

**Date:** 2026-04-25  
**Status:** Agreed → Proceed to plan

---

## Problem Statement

Cần tạo module sinh **hóa đơn bán lẻ** (chứng từ giải ngân) cho KHCN, liên kết với disbursement và dẫn chiếu phương án kinh doanh. Có 4 loại mẫu: Tạp hóa/Đồ uống, Vật liệu xây dựng, Thiết bị y tế, Nông sản.

---

## Template Analysis (4 DOCX)

Tất cả 4 mẫu có cùng cấu trúc bảng:
```
STT | Tên hàng hóa | ĐVT | Số lượng | Đơn giá (đ) | Thành tiền (đ)
```
Mẫu 2 (VLXD) và 3 (Y tế) thêm cột **Ghi chú**.

Placeholders: Số HĐ (dotted), Ngày, Người mua, Địa chỉ, Tổng cộng bằng chữ.

**Key insight:** `LoanPlan.cost_items_json` đã có `{ name, unit, qty, unitPrice, amount }` — mapping 1-1 với bảng hóa đơn.

---

## Agreed Solution

### Approach: `items_json` trên Invoice (Approach A)

```prisma
model Invoice {
  // existing fields unchanged
  items_json   String?  @default("[]")  // CostItem[] JSON
  templateType String?  // tap_hoa | vlxd | y_te | nong_san
}
```

Reuse `CostItem { name, unit, qty, unitPrice, amount }` type từ loan-plan — không define lại.

### User Flow

```
Disbursement detail page
  └─ [Tạo chứng từ mua hàng]
       └─ RetailInvoiceModal
            Step 1: Chọn loại HĐ (4 radio buttons)
            Step 2: Item picker từ LoanPlan.cost_items
                   ⚠ Soft warning nếu qty/giá vượt PA
            Step 3: Edit bảng (qty, unitPrice editable)
                   → subtotal = qty × unitPrice (auto)
                   → total = Σ subtotal (auto)
            Step 4: Supplier info + ngày → [Tải DOCX]
```

### Pre-fill: User chọn từng item từ PA (không auto-load tất cả)

### Validation: Soft warning khi vượt PA (không block)

### UI placement: Trong trang/modal Giải ngân

---

## Template DOCX Design

4 file mới với `{#items}...{/items}` docxtemplater loop:

```
Placeholders:
{supplier_name}, {supplier_address}, {supplier_phone}
{invoice_number}, {issue_date}
{customer_name}, {customer_address}
{#items} → { i, name, unit, qty, unit_price, subtotal } {/items}
{total}, {total_words}
{payment_method}  ← Mẫu 2, 4
{note}            ← Mẫu 2
```

---

## Implementation Phases

| Phase | Task | Size |
|-------|------|------|
| 01 | Schema: `items_json` + `templateType` + migration | S |
| 02 | API: update Invoice create/update; GET PA cost-items | S |
| 03 | DOCX: tạo 4 template mới với `{#items}` loop | M |
| 04 | Service: `generateRetailInvoice(invoiceId)` → buffer | M |
| 05 | UI: `RetailInvoiceModal` 4 bước + disbursement integration | M |

---

## Risks

- docxtemplater `angular-parser` cần verify compat với version hiện tại
- `total_words` (bằng chữ) — kiểm tra có sẵn utility VN number-to-words chưa
- Supplier info tĩnh (hardcode per template) hay dynamic? → Giả định tĩnh per template type

---

## Unresolved Questions

- Supplier name/address: hardcode trong template hay cho nhập mỗi lần? (ảnh hưởng Phase 03/05)
- Có cần lưu lại hóa đơn đã generate (link PDF/DOCX vào Invoice record) không?
