# Brainstorm: Bộ hồ sơ Thẻ Lộc Việt (Thẻ tín dụng)

## Problem Statement

Thêm bộ hồ sơ vay mới cho sản phẩm **Thẻ tín dụng Lộc Việt** vào hệ thống KHCN. 4 template DOCX trong `report_assets/KHCN templates/Hồ sơ thẻ Lộc Việt/`.

## 4 Templates

| # | File | Mục đích |
|---|------|----------|
| 1 | 12299 Hop dong the tin dung Loc Viet.docx | Hợp đồng thẻ tín dụng |
| 2 | 12299.01 Giay de nghi phat hanh the LV kiem HD.docx | Giấy đề nghị phát hành thẻ |
| 3 | 1919.09 BCTD phat hanh the Loc Viet.docx | Báo cáo thẩm định phát hành thẻ |
| 4 | 8857.22.Phieu nhan ho so kiem giay hen Ca nhan.docx | Phiếu nhận hồ sơ kiêm giấy hẹn |

## Placeholder Analysis

### Đã có trong builder hiện tại (reuse ngay)

| Placeholder | Builder |
|---|---|
| `[Tên khách hàng]`, `[CMND]`, `[Ngày cấp]`, `[Nơi cấp]`, `[Địa chỉ]` | khcn-report-data-builder |
| `[Danh xưng]`, `[Tên gọi in hoa]`, `[Tên chi nhánh/PGD]` | khcn-report-data-builder |
| `[Ngày]`, `[Tháng]`, `[Năm]`, `[Năm sinh]`, `[Giới tính]` | khcn-report-data-builder |
| `[Email]`, `[Số điện thoại]` / `[Điện thoại]` | khcn-report-data-builder |
| `[Người phê duyệt]`, `[Chức vụ NPD]` | khcn-report-data-builder (approver) |
| `[Địa chỉ trụ sở]`, `[Fax]` | khcn-report-data-builder (branch) |
| `[HĐTD.Xếp hạng khách hàng]`, `[HĐTD.Nhóm nợ]` | khcn-builder-credit |
| `[Dư nợ ngắn hạn]`, `[Dư nợ trung dài hạn]`, `[Tổng dư nợ]` | khcn-builder-credit |
| `[Mục đích ngắn hạn]`, `[Mục đích trung dài hạn]`, `[Nguồn trả nợ]` | khcn-builder-credit |
| Land TSBĐ: `[Diện tích đất]`, `[Diện tích XD]`, `[Diện tích sàn]`, ... | khcn-builder-collateral-land |
| Vehicle ĐS: `[ĐS.Biển kiểm soát]`, `[ĐS.Số máy]`, `[ĐS.Số khung]`, ... | khcn-builder-collateral-vehicle |
| `[#DUNỢ]`/`[/DUNỢ]`, `[#TSBD_CHI_TIET]`/`[/TSBD_CHI_TIET]` loops | khcn-report-helpers |
| `[Địa danh]` | khcn-report-data-builder |

### CHƯA CÓ — cần thêm mới (4 trường HĐTD thẻ)

| Placeholder | Mô tả | Nguồn dữ liệu đề xuất |
|---|---|---|
| **`[HĐTD.Hạn mức thẻ tín dụng]`** | Số tiền hạn mức thẻ | Loan field mới hoặc `loanAmount` |
| **`[HĐTD.HMTTD bằng chữ]`** | Hạn mức bằng chữ | Auto-convert từ số (docso) |
| **`[HĐTD.Số tài khoản]`** | Số tài khoản thẻ | Customer `bank_account` hoặc field mới trên Loan |
| **`[HĐTD.Thời hạn hiệu lực của thẻ]`** | VD: "36 tháng" | Field mới trên Loan |

### CHƯA CÓ — customer info bổ sung

| Placeholder | Mô tả | Đề xuất |
|---|---|---|
| **`[Nghề nghiệp]`** | Nghề nghiệp KH | Thêm vào `data_json` (không cần migration) |
| **`[Quốc tịch]`** | Quốc tịch | Thêm vào `data_json` |
| **`[Nơi công tác]`** | Nơi làm việc | Đã có `earner1_workplace` trong loan plan, map vào |
| **`[Thu nhập bình quân/tháng]`** | Thu nhập | Đã có `earner1_monthly_income` trong loan plan |
| **`[Loại giấy tờ tùy thân]`** | VD: "CCCD" | Default "CCCD" hoặc thêm vào `data_json` |
| **`[Ngành nghề kinh doanh]`** | Business sector | `main_business` trên Customer |

### Collateral contract fields (đã có partial)

| Placeholder | Mô tả | Status |
|---|---|---|
| `[Số HĐ thế chấp]` | Số hợp đồng thế chấp | Có trong collateral builder |
| `[Ngày ký HĐTC]` | Ngày ký HĐ thế chấp | Có trong collateral builder |
| `[Tên HĐ thế chấp]` | Tên HĐ thế chấp | Cần verify |
| `[Văn bản sửa đổi, bổ sung]` | Amendment docs | Cần verify |

## Implementation Approach

### Option A: Loan method mới `the_loc_viet` (Recommended)

- Thêm `"the_loc_viet"` vào `LOAN_METHODS`
- Registry: 4 templates với `methods: ["the_loc_viet"]`
- Category mới: `"the_loc_viet"` → "Hồ sơ thẻ Lộc Việt"
- Builder: thêm block map 4 placeholder HĐTD thẻ mới

**Pros:** Tách biệt rõ ràng, filter đúng templates, không ảnh hưởng methods khác
**Cons:** Thêm 1 method → cần update METHOD_OPTIONS, constants, schema

### Option B: Dùng loan method hiện có + category riêng

- Giữ loan method = `"tung_lan"` hoặc `"han_muc"`
- Templates dùng `methods: []` (all methods) hoặc tag riêng
- Category: `"the_loc_viet"`

**Pros:** Không cần thêm method
**Cons:** Templates thẻ tín dụng sẽ hiện cho tất cả loan types → gây confuse

### Recommendation: Option A

Thẻ tín dụng là sản phẩm hoàn toàn khác biệt so với vay SXKD/tiêu dùng. Cần method riêng.

## Scope of Changes

### Không cần migration (dùng data_json + financials_json)

1. **Registry:** Thêm 4 entries, 1 category label mới
2. **Placeholder registry:** Thêm group "Thẻ tín dụng Lộc Việt"
3. **Constants:** Thêm `"the_loc_viet"` vào LOAN_METHODS, METHOD_OPTIONS, labels
4. **Zod schema:** Thêm `"the_loc_viet"` vào loanMethodEnum
5. **Builder:** Thêm block trong khcn-builder-loan để map 4 placeholder HĐTD thẻ mới
6. **Customer data_json:** Map `Nghề nghiệp`, `Quốc tịch`, `Loại giấy tờ tùy thân` từ data_json

### DB fields cần xem xét

- `HĐTD.Số tài khoản` → có thể dùng `customer.bank_account` hoặc thêm field mới trên Loan
- `HĐTD.Hạn mức thẻ tín dụng` → map từ `loan.loanAmount`
- `HĐTD.Thời hạn hiệu lực của thẻ` → tính từ `loan.startDate` → `loan.endDate` (auto)

## Risks

- `[HĐTD.Số tài khoản]` xuất hiện trong cả 4 file → field quan trọng, cần quyết định source
- `[HĐTD.HMTTD bằng chữ]` cần hàm chuyển số → chữ (đã có `docso` trong codebase)
- `[Nghề nghiệp]`, `[Quốc tịch]` chưa có UI nhập → cần form field trong customer info

## Next Steps

1. Quyết định: loan method mới hay dùng method hiện có?
2. Quyết định: `HĐTD.Số tài khoản` lấy từ đâu?
3. Implement registry + builder + constants
4. Thêm form fields cho Nghề nghiệp, Quốc tịch nếu cần
