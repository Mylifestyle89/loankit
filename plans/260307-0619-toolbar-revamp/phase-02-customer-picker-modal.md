---
phase: 2
status: complete
priority: high
effort: L
completed: 2026-03-07
---

# Phase 2: Customer Picker Modal

## Overview
Tao CustomerPickerModal cho phep chon KH co san hoac tao KH moi. Move chuc nang "Them khach hang" tu tab Danh sach KH sang day.

## Context Links
- API: `src/app/api/customers/route.ts` — GET (list) + POST (create)
- Store: `src/app/report/mapping/stores/use-customer-store.ts`
- Sidebar context (reference): `src/app/report/mapping/components/sidebar/sidebar-context-section.tsx`

## Related Code Files

### Create
- `src/app/report/mapping/components/Modals/CustomerPickerModal.tsx`

### Modify
- `src/app/report/mapping/page.tsx` — wire modal open/close + callback

## Requirements

### CustomerPickerModal (~180 lines)

Props:
```tsx
type CustomerPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customerId: string) => void;
};
```

UI Layout:
```
+---------------------------------------+
| Chon khach hang                    [X] |
+---------------------------------------+
| [Search input...]                      |
| +-----------------------------------+ |
| | KH001 - Nguyen Van A              | |  <- clickable row
| | KH002 - Tran Thi B                | |
| | ...                                | |
| +-----------------------------------+ |
| ------- hoac -------                   |
| [+ Tao khach hang moi]  <- toggle form |
| +-----------------------------------+ |
| | Ma KH: [____]                      | |
| | Ten KH: [____]                     | |
| | Dia chi: [____] (optional)         | |
| | [Huy]              [Tao & Chon]    | |
| +-----------------------------------+ |
+---------------------------------------+
```

Behavior:
1. Mo modal -> fetch customers tu store (da co san)
2. Search filter theo ten/ma KH
3. Click row -> onSelect(customerId) + onClose
4. Toggle form "Tao KH moi":
   - Fields: customer_code (required), customer_name (required), address (optional)
   - Submit: POST /api/customers -> refresh store -> onSelect(newId) + onClose
5. Loading + error states

### page.tsx Wiring
```tsx
const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

// In toolbar:
onOpenCustomerPicker={() => setCustomerPickerOpen(true)}

// Modal:
<CustomerPickerModal
  isOpen={customerPickerOpen}
  onClose={() => setCustomerPickerOpen(false)}
  onSelect={(id) => {
    setEditingFieldTemplateId("");
    setEditingFieldTemplateName("");
    setSelectedCustomerId(id);
    setCustomerPickerOpen(false);
  }}
/>
```

## Implementation Steps

1. Tao CustomerPickerModal.tsx:
   - Portal + AnimatePresence (nhu cac modal khac)
   - Search filter state
   - Toggle create form
   - POST /api/customers cho tao moi
   - Refresh customer list sau khi tao
2. Wire vao page.tsx

## Todo
- [x] Create CustomerPickerModal.tsx
- [x] Wire into page.tsx
- [x] Test: chon KH co san
- [x] Test: tao KH moi
- [x] Test: search filter
- [x] Compile check

## Success Criteria
- Modal mo/dong smooth (animation)
- Chon KH co san -> set store + close
- Tao KH moi -> POST API -> refresh list -> select + close
- Search filter hoat dong
- Error handling cho API calls
- Dark mode tuong thich

## Risk Assessment
- API POST /api/customers da co san, schema: customer_code, customer_name, address (optional)
- Store setSelectedCustomerId da co san
- Can reset editingFieldTemplateId/Name khi doi KH (nhu sidebar hien tai)
