---
phase: 05
title: UI — RetailInvoiceModal
status: completed
effort: M
blockedBy: phase-02,phase-04
completed: 2026-04-25
---

# Phase 05 — UI: RetailInvoiceModal

## File mới: `src/components/invoice-tracking/retail-invoice-modal.tsx`

## Nơi mount

Trong `DisbursementFormModal` hoặc trang disbursement detail — thêm nút **"Tạo chứng từ mua hàng"** → mở `RetailInvoiceModal`.

Cũng có thể mount trong `src/components/invoice-tracking/invoice-table.tsx` theo từng invoice row (nút "Tạo HĐ bán lẻ").

## 4-step wizard

### Step 1 — Chọn loại hóa đơn

```tsx
const TEMPLATE_OPTIONS = [
  { key: "tap_hoa",  label: "Tạp hóa / Đồ uống",    icon: "🛒" },
  { key: "vlxd",     label: "Vật liệu xây dựng",      icon: "🏗️" },
  { key: "y_te",     label: "Thiết bị y tế",           icon: "🏥" },
  { key: "nong_san", label: "Nông sản / Phiếu bán",    icon: "🌾" },
];
// Radio buttons, 4 cards dạng 2x2 grid
```

### Step 2 — Chọn items từ Phương án kinh doanh

```tsx
// Fetch: GET /api/loan-plans/[loanPlanId]/cost-items
// loanPlanId lấy từ disbursement.loan.loanPlanId

// Hiển thị list checkboxes với columns: Tên | ĐVT | SL (PA) | Đơn giá (PA)
// User tick chọn items muốn đưa vào hóa đơn

// Soft warning logic:
// nếu không có loanPlanId → hiển thị notice "Khoản vay chưa có PAKD"
//                         → vẫn cho tiếp tục với bảng trống
```

### Step 3 — Điền bảng hóa đơn

```tsx
// Bảng editable với columns: STT | Tên mặt hàng | ĐVT | Số lượng | Đơn giá | Thành tiền
// Pre-filled từ items chọn ở Step 2
// qty và unitPrice cho edit, name và unit read-only
// Thành tiền = qty × unitPrice (auto-compute, không editable)
// Tổng cộng = Σ Thành tiền (auto)

// Warning nếu vượt PA:
// item.qty > paItem.qty → hiển thị badge ⚠️ vàng bên cạnh qty field
// item.unitPrice > paItem.unitPrice × 1.2 → cảnh báo giá cao hơn PA 20%

// Thêm/xóa dòng: nút [+ Thêm hàng] / [✕] theo từng row
```

### Step 4 — Thông tin và tải file

```tsx
// Fields:
// - Số hóa đơn (invoiceNumber — pre-filled từ invoice)
// - Ngày lập (issueDate — default today)
// - Nhà cung cấp / người bán (supplierName)
// - Hình thức thanh toán (chỉ hiện nếu templateType = vlxd | nong_san)

// Action:
// [Tải DOCX] → POST /api/invoices/[id]/retail-doc { templateType }
//            → download file
// [Lưu items vào HĐ] → cập nhật Invoice.items_json + templateType
//                    → PATCH /api/invoices/[id] { items, templateType }
```

## State shape

```ts
type ModalState = {
  step: 1 | 2 | 3 | 4;
  templateType: RetailTemplateKey | null;
  paItems: CostItem[];           // fetched from API
  selectedPaItems: string[];     // item names selected in Step 2
  rows: InvoiceLineItem[];       // editable rows in Step 3
  supplierName: string;
  invoiceNumber: string;
  issueDate: string;
  paymentMethod: string;
  generating: boolean;
  error: string;
};
```

## Component props

```tsx
interface RetailInvoiceModalProps {
  invoiceId: string;
  loanPlanId?: string | null;     // để fetch PA items
  initialSupplierName?: string;
  initialInvoiceNumber?: string;
  onClose: () => void;
  onSaved?: () => void;           // callback sau khi lưu items
}
```

## Integration điểm

Gọi `RetailInvoiceModal` từ:
1. **`invoice-table.tsx`** — thêm button "Tạo HĐ bán lẻ" trên từng row
2. **DisbursementFormModal** — button sau khi tạo invoice

```tsx
// Trong invoice-table.tsx, thêm vào actions cell:
{!inv.id.startsWith("virtual-") && (
  <button onClick={() => setRetailInvoiceId(inv.id)}>
    Tạo HĐ
  </button>
)}
{retailInvoiceId && (
  <RetailInvoiceModal
    invoiceId={retailInvoiceId}
    loanPlanId={disbursement?.loan?.loanPlanId}
    onClose={() => setRetailInvoiceId(null)}
  />
)}
```

## Styling

Dùng pattern `BaseModal` hiện có. Steps: progress bar trên đầu (4 dots). Bảng Step 3 dùng `<table>` tương tự `invoice-table.tsx`.

## Todo

- [ ] Tạo `src/components/invoice-tracking/retail-invoice-modal.tsx`
- [ ] Step 1: Template selector cards
- [ ] Step 2: PA cost-items picker (fetch + checkbox list)
- [ ] Step 3: Editable invoice table với auto-calc + soft warnings
- [ ] Step 4: Metadata form + download trigger
- [ ] Thêm button trigger vào `invoice-table.tsx`
- [ ] PATCH endpoint để lưu items_json vào invoice (reuse existing PATCH /api/invoices/[id])
- [ ] `npx tsc --noEmit` — 0 errors

## Success Criteria

- User mở modal, chọn template → Step 1 ✓
- PA items load từ API → Step 2 ✓
- Bảng auto-calc đúng (subtotal = qty × unitPrice, total = Σ) → Step 3 ✓
- Soft warning hiện khi vượt PA → Step 3 ✓
- Download DOCX với data đã nhập → Step 4 ✓
- Sau save: invoice.items_json được cập nhật → kiểm tra DB ✓
