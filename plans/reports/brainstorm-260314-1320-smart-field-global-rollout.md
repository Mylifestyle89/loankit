# Brainstorm: SmartField Global Rollout

**Date:** 2026-03-14 | **Branch:** KHCN-implement

## Problem Statement

SmartField (auto-switch input↔select) chỉ dùng ở tab "Nơi cho vay" (4 fields). Cần mở rộng ra **toàn bộ** màn hình nhập liệu KHCN để user tự quyết định field nào cần dropdown.

## Decisions Made

| Quyết định | Chọn | Lý do |
|---|---|---|
| **Namespace** | Prefix theo context | `collateral.certificate_name`, `credit_agri.debt_group` — mỗi context có dropdown riêng |
| **Phạm vi** | Tất cả text fields dùng SmartField | User toàn quyền quyết định field nào cần dropdown |
| **UX nút [+]** | Ẩn, chỉ hiện khi hover | Giảm visual noise, giao diện sạch |
| **Seed data** | Có, seed ~10 field phổ biến | User mở ra đã có dropdown sẵn |
| **Field types** | SmartField chỉ cho text fields | Giữ input riêng cho số/ngày (có format đặc biệt) |

## Recommended Solution

### 1. SmartField Enhancement

**Thay đổi SmartField:**
- Thêm hover behavior: nút [+] chỉ hiện khi hover vào field (ẩn mặc định)
- Nếu đã có options → icon ListPlus luôn hiện (vì user cần biết đây là dropdown có quản lý)

### 2. Namespace Convention

```
{section}.{field_key}

Ví dụ:
- collateral.certificate_name
- collateral.land_purpose
- collateral.house_structure
- collateral.ownership_form
- credit_agri.debt_group
- credit_agri.loan_purpose
- credit_other.debt_group
- co_borrower.relationship
- co_borrower.id_type
- related_person.relationship
- customer.main_business
```

### 3. Integration per Section

| Section | File | Text fields → SmartField | Giữ nguyên input |
|---|---|---|---|
| **Collateral** | `customer-collateral-section.tsx` | certificate_name, land_purpose, house_structure, house_ownership, ownership_form, house_level, land_origin, doc_type, doc_place, issuing_agency, insurance, asset_status, liquidity, legality | land_value, house_value, land_area (number); mortgage_date, doc_date (date) |
| **Credit Info** | `customer-credit-info-section.tsx` | branch_name, debt_group, loan_purpose, repayment_source, institution_name | debt_amount, loan_term (number) |
| **Co-borrower** | `customer-co-borrower-section.tsx` | title, id_type, id_issued_place, relationship | birth_year, id_issued_date (date); phone (number) |
| **Related Person** | `customer-related-person-section.tsx` | relationship, id_type | — |
| **Main form** | `page.tsx` | main_business, organization_type, legal_representative_title | cccd, phone (number); date_of_birth (date) |

### 4. Seed Data (migration)

Seed sẵn dropdown options cho các field phổ biến:

```
collateral.certificate_name:
  - Giấy chứng nhận QSD đất, quyền sở hữu nhà ở và tài sản khác gắn liền với đất
  - Giấy chứng nhận QSD đất (Sổ đỏ)
  - Giấy chứng nhận quyền sở hữu nhà ở (Sổ hồng)

collateral.land_purpose:
  - Đất ở tại nông thôn
  - Đất ở tại đô thị
  - Đất nông nghiệp
  - Đất thương mại dịch vụ

collateral.house_structure:
  - Bê tông cốt thép
  - Bán kiên cố
  - Tạm

credit_agri.debt_group / credit_other.debt_group:
  - Nhóm 1 (Đủ tiêu chuẩn)
  - Nhóm 2 (Cần chú ý)
  - Nhóm 3 (Dưới tiêu chuẩn)
  - Nhóm 4 (Nghi ngờ)
  - Nhóm 5 (Có khả năng mất vốn)

co_borrower.id_type:
  - CCCD
  - CMND
  - Hộ chiếu

co_borrower.relationship:
  - Vợ/Chồng
  - Cha/Mẹ
  - Con
  - Anh/Chị/Em
```

### 5. Implementation Steps

1. **SmartField update**: Thêm hover-to-show [+] button behavior
2. **Seed migration**: Tạo prisma seed cho dropdown options
3. **Collateral section**: Replace text inputs → SmartField với prefix `collateral.`
4. **Credit info section**: Replace text inputs → SmartField với prefix `credit_agri.`/`credit_other.`
5. **Co-borrower section**: Replace text inputs → SmartField với prefix `co_borrower.`
6. **Related person section**: Replace text inputs → SmartField với prefix `related_person.`
7. **Main customer form**: Replace text inputs → SmartField với prefix `customer.`
8. **Branch-staff section**: Update existing SmartField keys thêm prefix `branch.` (backward compat: migrate existing data)

### 6. Migration Strategy cho existing data

Existing dropdown_options có fieldKey flat (vd: `approver_title`). Cần migration:
- Rename existing keys: `approver_title` → `branch.approver_title`
- Hoặc: SmartField fallback — check prefixed key trước, nếu không có thì check flat key

**Recommend:** Migration rename để clean, tránh logic phức tạp.

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Breaking existing dropdown data | High | Migration rename old keys |
| Too many API calls (mỗi SmartField fetch riêng) | Medium | Batch fetch: load all options cho 1 section cùng lúc |
| Visual clutter nếu nhiều fields có dropdown | Low | Hover-to-show [+] giảm noise |

## Performance Consideration

Hiện mỗi SmartField mount → 1 GET request. Nếu Collateral form có 14 SmartField → 14 requests.

**Giải pháp:** Tạo `useDropdownOptionsGroup(prefix)` hook — fetch tất cả options có fieldKey bắt đầu bằng prefix trong 1 request. Pass xuống SmartField qua context hoặc prop.

## Next Steps

1. Tạo implementation plan chi tiết
2. Implement theo thứ tự: SmartField enhance → batch hook → seed data → integrate per section
