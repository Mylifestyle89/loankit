# KHCN — placeholder DOCX & gộp trường

Tài liệu ngắn: cách hệ thống map dữ liệu vào mẫu, trường nào **tương đương**, và cách **tự sửa mẫu Word**.

## 1. Người dùng tự chỉnh template

- Placeholder trong DOCX theo cú pháp của `docxEngine` (thường `{Tên trường}` — giữ đúng tên trong panel **Tham chiếu placeholder** trên UI KHCN).
- Có thể **đổi tên placeholder trong file `.docx`** sang một trong các **tên chuẩn** liệt kê trong `src/lib/report/khcn-placeholder-registry.ts` hoặc copy từ panel.
- Nếu một mẫu dùng tên **lạ / cũ**, ưu tiên đổi mẫu về tên trong registry thay vì thêm logic code (trừ khi nhiều mẫu hàng loạt cần alias).

## 2. Đã gộp / đồng bộ trong code

| Chủ đề | Hành vi |
|--------|--------|
| **HĐ cũ** | `PA.Số HĐTD cũ`, `PA.HĐ cũ Số`, `HĐTD.Số HĐ cũ` (và bộ ngày tương ứng) được **điền chéo** nếu chỉ có một nguồn có dữ liệu. |
| **UNC** | `UNC.Tên người nhận` = `UNC.Khách hàng thụ hưởng`; `UNC.Ngân hàng` = `UNC.Nơi mở tài khoản`. Hàng chỉ số `UNC.Địa chỉ N` lấy **địa chỉ** beneficiary, không còn nhầm với ngân hàng. |
| **Phương thức cho vay** | `HĐTD.Phương thức cho vay`: ưu tiên **nhập tay** trên HĐ (`lending_method`), không có mới map từ `loan_method` (sản phẩm). |
| **Tổng TSBĐ / NVBĐ (HĐTD + tổng)** | Có bản ghi TSBĐ chi tiết → dùng **tổng từ danh sách TSBĐ**; không có → dùng **snapshot trên khoản vay** (`collateralValue` / `securedObligation`). Định dạng số thống nhất (`fmtN`); `HĐTD.TGTTSBĐ bằng chữ` / `HĐTD.TNVBĐ*` đồng bộ với nguồn đó. |

## 3. Alias cố ý (nên giữ hoặc chỉnh mẫu)

- `HĐTD.Số tiền vay` vs `HĐTD.số tiền vay` — khác chữ hoa cho đúng mẫu cũ.
- `HĐTD.STvay bằng chữ` vs `HĐTD.Bằng chữ` — cùng mục đích (bằng chữ số tiền vay).
- `HĐTD.TNVBĐ bằng chữ` vs `HĐTD.TNVBĐTĐ bằng chữ` — cùng giá trị (mẫu khác nhau).
- `PA.Lãi vay` và `PA.Lãi vay NH` — cùng **lãi dự kiến** sau khi tính từ phương án; mẫu chỉ cần dùng một key.

## 4. Trường gần như luôn trống (chờ nhập tay hoặc override API)

Một số key trong builder chỉ là **chỗ dành sẵn** trong mẫu (ví dụ `HĐTD.Phí khác`, `Danh xưng NPD`, …). Có thể:

- Sửa trực tiếp sau khi xuất Word, hoặc  
- Bổ sung sau nếu có API `overrides` / form mới.

## 5. File tham chiếu code

- `src/services/khcn-report.service.ts` — orchestrate data + merge HĐ cũ + UNC flat
- `src/services/khcn-builder-*.ts` — từng nhóm HĐTD / GN / PA / TSBĐ
- `src/lib/report/khcn-placeholder-registry.ts` — danh sách cho panel copy

---

*Cập nhật: đồng bộ với chỉnh sửa merge placeholder KHCN trong codebase.*
