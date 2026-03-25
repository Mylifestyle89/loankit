# .BK File Importer - Mapping Guide

## Tóm tắt
File `.bk` là JSON từ một ứng dụng C/C++ cũ, chứa dữ liệu hồ sơ vay vốn **phẳng** (flat structure).
Cần **map** 54 attributes sang FrameworkState template của chúng ta.

---

## Mapping: .BK Attributes → FrameworkState Fields

### A. THÔNG TIN CHUNG (A.general.*)

| .BK Field | FrameworkState Field | Ghi chú |
|-----------|---|---|
| Tên khách hàng | A.general.customer_name | `"Công ty TNHH ĐT TM DV Út Huy"` |
| Số ĐKKD | A.general.customer_code | `"5400545361"` |
| Địa chỉ | A.general.address | `"Tổ 2 Phát Chi, phường Xuân Trường - Đà Lạt, tỉnh Lâm Đồng"` |
| Ngành nghề SXKD | A.general.main_business | `"Bán buôn nhiên liệu rắn, lỏng, khí; Kinh doanh VLXD"` |
| Vốn điều lệ | A.general.charter_capital | `"7.000.000.000"` (đơn vị: đồng) |
| Người đại diện theo pháp luật | A.general.legal_representative_name | `"Thiều Thị Thu Loan"` |
| Chức vụ | A.general.legal_representative_title | `"Giám đốc"` |
| Loại hình tổ chức | A.general.organization_type | `"Công ty trách nhiệm hữu hạn"` |
| Vốn điều lệ | A.general.total_assets_latest | *tính từ BCTC* (không có trong .BK) |
| VCSH | A.general.owner_equity_latest | *tính từ BCTC* (không có trong .BK) |

### B. THÔNG TIN TÍN DỤNG (A.credit.*)

| .BK Field | FrameworkState Field | Ghi chú |
|-----------|---|---|
| Số HĐ tín dụng | A.credit.current_credit_relationship | `"5400LAV202301080"` |
| Dư nợ | A.credit.outstanding_agri | `"185.215.929"` (đơn vị: đồng) |
| Dư nợ (nếu có) | A.credit.outstanding_other_banks | *nếu có dữ liệu* |
| Xếp hạng (nếu có) | A.credit.rating_agribank | *từ CIC hoặc dữ liệu khác* |
| Xếp hạng CIC | A.credit.rating_cic | *nếu có dữ liệu* |
| Nhóm nợ | A.credit.debt_group_latest | *nếu có dữ liệu* |

### C. ĐỀ XUẤT VAY (A.proposal.*)

| .BK Field | FrameworkState Field | Ghi chú |
|-----------|---|---|
| Số tiền vay | A.proposal.loan_amount_agribank | `"219.000.000"` |
| Hạn trả cuối cùng | A.proposal.loan_tenor_or_limit_term | `"07/12/2023"` (hoặc tính khoảng thời gian) |
| Mục đích tra cứu CIC | A.proposal.loan_purpose | `"Kiểm tra TTTD trước khi cho vay"` hoặc custom |
| Tổng nhu cầu (nếu có) | A.proposal.total_credit_demand | *nếu có dữ liệu* |

### D. QUẢN TRỊ & LÃNH ĐẠO (A.management.*)

| .BK Field | FrameworkState Field | Ghi chú |
|-----------|---|---|
| Tên Chủ tịch HĐTV / Giám đốc | A.management.executive_team | `"Thiều Thị Thu Loan (Giám đốc)"` |
| Kế toán trưởng | A.management.executive_team | `"Phan Thị Kim Ngọc (Kế toán trưởng)"` |
| *ClientAssets (Ban lãnh đạo)* | A.management.major_shareholders | Array từ `ClientAssets` |

### E. GIẤY TỜ & NGƯỜI LIÊN QUAN (A.*)

| .BK Field | FrameworkState Field | Ghi chú |
|-----------|---|---|
| Loại giấy tờ pháp lý | A.general.* | `"Giấy chứng nhận ĐKKD"` |
| Ngày cấp ĐKKD | A.general.* | `"cấp lần đầu ngày 12/11/2007..."` |
| Nơi cấp ĐKKD | A.general.* | `"Phòng đăng ký kinh doanh - Sở Kế hoạch và Đầu tư tỉnh Lâm Đồng"` |
| Người đại diện | A.management.related_parties | Nếu khác với legal representative |
| CMND | *Document* | `"068175000495"` |

### F. TÀI SẢN BẢO ĐẢM (A.collateral.*)

| .BK Field | FrameworkState Field | Ghi chú |
|-----------|---|---|
| Tên HĐ thế chấp | A.collateral.assets | `"Hợp đồng thế chấp Quyền sử dụng đất..."` |
| Số HĐ thế chấp | A.collateral.assets | `"2973"` |
| Ngày ký HĐTC | A.collateral.assets | `"07/4/2021"` |
| *ClientAssets* | A.collateral.assets | Danh sách từ array `ClientAssets` |

---

## Fields Không có trong .BK (cần từ BCTC Excel)

```
❌ A.general.total_assets_latest → từ BCTC mã số 270
❌ A.general.owner_equity_latest → từ BCTC mã số 400
❌ A.credit.outstanding_other_banks → phải hỏi khách hàng
❌ A.credit.rating_agribank → từ hệ thống internal
❌ A.credit.rating_cic → từ query CIC (step 3)
❌ B.financial.* → TẤT CẢ từ Excel BCTC + AI analysis
```

---

## ClientAssets Structure (Nested)

```json
{
  "Title": "Ban lãnh đạo",
  "Code": "BLĐ",
  "ChangedTitle": "Ban lãnh đạo 1",
  "AssetProperties": [
    { "Key": "Họ và tên", "Value": "Thiều Thị Thu Loan" },
    { "Key": "Năm sinh", "Value": "1975" },
    { "Key": "Chức danh", "Value": "Giám đốc" }
  ]
}
```

**Map sang:**
- `A.management.executive_team` (array of names + titles)
- `A.management.major_shareholders` (nếu owner)
- `A.management.related_parties` (nếu stakeholder khác)

---

## Import Flow

```
.BK File (JSON)
    ↓
Extract Client + ClientAttributes + ClientAssets
    ↓
Map to FrameworkState (A.* sections)
    ↓
Merge with BCTC Excel (B.financial.*)
    ↓
Complete FrameworkState object
```

---

## Implementation Considerations

### 1. Dữ liệu lỏng lẻo
- Một số fields có giá trị `".........................."` = **empty/incomplete**
- Cần handle: `value.startsWith(".") ? null : value`

### 2. Định dạng số
- Số tiền: `"219.000.000"` (format Việt, phân cách bằng dấu `.`)
- Cần parse: `value.replace(/\./g, "")` → `"219000000"`

### 3. Định dạng ngày
- Format: `"07/08/2023"` (dd/mm/yyyy)
- Chuẩn hóa: `parseVietnameseDate("07/08/2023")` → `2023-08-07`

### 4. Xử lý ClientAssets
- 48 assets có thể bao gồm: Ban lãnh đạo, Cổ đông, Tài sản bảo đảm
- Cần phân loại theo `Code` hoặc `Title`

### 5. Merge Strategy
- `.BK` → populate A.* sections
- `BCTC Excel` → populate B.financial.* sections
- `Qualitative input` → populate Notes/Context
- **Output:** Một FrameworkState hoàn chỉnh

---

## Ví dụ Mapping Chi Tiết

**Input (.BK):**
```json
{
  "Tên khách hàng": "Công ty TNHH ĐT TM DV Út Huy",
  "Số ĐKKD": "5400545361",
  "Địa chỉ": "Tổ 2 Phát Chi, phường Xuân Trường - Đà Lạt, tỉnh Lâm Đồng",
  "Vốn điều lệ": "7.000.000.000",
  "Dư nợ": "185.215.929"
}
```

**Output (FrameworkState):**
```json
{
  "field_catalog": [...],
  "values": {
    "A.general.customer_name": "Công ty TNHH ĐT TM DV Út Huy",
    "A.general.customer_code": "5400545361",
    "A.general.address": "Tổ 2 Phát Chi, phường Xuân Trường - Đà Lạt, tỉnh Lâm Đồng",
    "A.general.charter_capital": "7000000000",
    "A.credit.outstanding_agri": "185215929",
    ...
  }
}
```

