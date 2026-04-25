# Phase 2: Tick chọn + hoàn thành hàng loạt hóa đơn

## Priority: High | Status: ⬜

## Yêu cầu
1. Thêm checkbox để chọn nhiều hóa đơn
2. Toolbar hiện khi có selection → nút "Hoàn thành đã chọn"
3. Hóa đơn `needs_supplement` (virtual) KHÔNG cho tick chọn hoàn thành — phải bổ sung đủ trước
4. Chỉ hóa đơn `pending` hoặc `overdue` mới được tick hoàn thành

## Related Files
- `src/components/invoice-tracking/invoice-table.tsx` — table component
- `src/app/report/invoices/page.tsx` — page (state + handlers)
- `src/app/api/invoices/[id]/route.ts` — PATCH endpoint (reuse per invoice)

## Implementation Steps

### 1. Update InvoiceTable (`invoice-table.tsx`)

**Props mới:**
```typescript
type Props = {
  // ...existing
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
};
```

**Thêm cột checkbox:**
- Header: checkbox "Select all" (chỉ select eligible: pending/overdue, non-virtual)
- Row: checkbox per invoice, disabled nếu `status === "needs_supplement"` hoặc `status === "paid"` hoặc virtual
- Tooltip trên disabled checkbox: "Cần bổ sung đủ hóa đơn trước khi hoàn thành"

### 2. Update InvoicesOverviewPage (`page.tsx`)

**State mới:**
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

**Bulk action toolbar:** Hiện khi `selectedIds.size > 0`
- Hiển thị số lượng đã chọn
- Nút "Hoàn thành đã chọn" → gọi handleBulkMarkPaid
- Nút "Bỏ chọn" → clear selection

**handleBulkMarkPaid:**
```typescript
async function handleBulkMarkPaid() {
  const ids = Array.from(selectedIds);
  await Promise.all(ids.map(id =>
    fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    })
  ));
  setSelectedIds(new Set());
  void loadData();
}
```

**Toggle handlers:**
```typescript
function toggleSelect(id: string) {
  setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}

function toggleSelectAll() {
  const eligible = invoices.filter(inv =>
    !inv.id.startsWith("virtual-") &&
    (inv.status === "pending" || inv.status === "overdue")
  );
  const allSelected = eligible.every(inv => selectedIds.has(inv.id));
  if (allSelected) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(eligible.map(inv => inv.id)));
  }
}
```

### 3. Pass props to InvoiceTable

Cả flat view và grouped view đều pass:
```tsx
<InvoiceTable
  invoices={...}
  onMarkPaid={handleMarkPaid}
  onSupplement={handleSupplement}
  selectable
  selectedIds={selectedIds}
  onToggleSelect={toggleSelect}
  onToggleSelectAll={toggleSelectAll}
/>
```

### 4. Clear selection khi filter thay đổi

```typescript
useEffect(() => { setSelectedIds(new Set()); }, [statusFilter, customerFilter]);
```

## Validation Rules (quan trọng)
- ❌ Virtual entries (`id.startsWith("virtual-")`) → checkbox disabled
- ❌ `status === "needs_supplement"` → checkbox disabled  
- ❌ `status === "paid"` → checkbox disabled (đã hoàn thành rồi)
- ✅ `status === "pending"` → checkbox enabled
- ✅ `status === "overdue"` → checkbox enabled

## Todo
- [ ] Add checkbox column to InvoiceTable
- [ ] Add selection state + handlers to page
- [ ] Add bulk action toolbar
- [ ] Add select all logic (only eligible)
- [ ] Clear selection on filter change
- [ ] Compile check
- [ ] Manual verify
