# Hướng Dẫn Sử Dụng v2.0

Ứng dụng quản lý hồ sơ cho vay, báo cáo thẩm định, và theo dõi giải ngân dành cho nhân viên ngân hàng.

---

## I. Đăng Nhập

1. Mở ứng dụng → trang đăng nhập hiển thị
2. Nhập **Email** và **Mật khẩu**
3. Nhấn **Đăng nhập** → hệ thống chuyển đến trang Mapping

Quên mật khẩu → liên hệ admin để đặt lại.

### Phân quyền

| Vai trò | Quyền |
|---------|-------|
| **Admin** | Toàn quyền + quản lý người dùng |
| **Editor** | Tạo/sửa khách hàng, khoản vay, báo cáo |
| **Viewer** | Chỉ xem, không chỉnh sửa |

---

## II. Thanh điều hướng (Sidebar)

Sidebar bên trái chứa các mục chính:

- **Khách hàng** — Quản lý danh sách khách hàng
- **Khoản vay** — Danh sách hợp đồng vay
- **Hóa đơn** — Theo dõi hóa đơn giải ngân
- **Mapping** — Ánh xạ trường dữ liệu cho báo cáo
- **Template** — Quản lý mẫu DOCX
- **Người dùng** — Tài khoản & quản trị (admin)
- **Tác vụ hệ thống** — Backup/Restore dữ liệu
- **Hướng dẫn** — Trang này

Sidebar trên Desktop: co lại khi không dùng, mở rộng khi hover.
Sidebar trên Mobile: nhấn nút hamburger để mở.

Các nút ở cuối sidebar:
- **Gợi ý AI** — Gợi ý mapping tự động
- **Chế độ sáng/tối** — Đổi giao diện
- **Ngôn ngữ** — Vi ↔ En
- **Đăng xuất**
- **Chuông thông báo** — Xem cảnh báo hóa đơn

---

## III. Khách Hàng

### Danh sách khách hàng
**Vào:** Sidebar → **Khách hàng**

- Tìm kiếm theo tên, mã khách, địa chỉ
- Lọc theo loại: **Tất cả** | **DN** (doanh nghiệp) | **CN** (cá nhân)
- Chuyển chế độ xem: **Bảng** hoặc **Thẻ**
- Sắp xếp theo cột (tên, mã, loại, ngày cập nhật)

### Tạo khách hàng mới
1. Nhấn **+ Thêm KH** (góc trên phải)
2. Chọn loại: **Doanh nghiệp** hoặc **Cá nhân**
3. Điền thông tin:
   - *Chung:* Mã KH, Tên KH, Địa chỉ
   - *DN:* Ngành nghề, vốn điều lệ, người đại diện, loại hình tổ chức
   - *CN:* CCCD/CMND, CMND cũ, năm sinh, SĐT
4. Nhấn **Thêm khách hàng**

### Nhập dữ liệu hàng loạt
Tại trang danh sách:
- **Nhập Dữ Liệu (JSON/XLSX/BK)** → Chọn file → Hệ thống tự import
- **Xuất Dữ Liệu** → Tải xuống toàn bộ danh sách

### Các thao tác khác
- **Đổi loại** — Chuyển KH giữa DN ↔ CN
- **Xóa** — Xóa khách hàng (có xác nhận)

---

## IV. Chi Tiết Khách Hàng

Nhấn vào tên KH từ danh sách → Trang chi tiết.

**Khách DN** hiển thị thẻ tóm tắt: tổng khoản vay, khoản vay đang hoạt động, tổng tiền vay.
**Khách CN (KHCN)** hiển thị thẻ hồ sơ cá nhân compact.

### Các tab chính

#### Tab "Nơi cho vay" (Branch)
- Cấu hình chi nhánh và nhân viên quản lý
- Áp dụng chung cho tất cả khách hàng

#### Tab "Người vay" / "Thông tin"
Form chỉnh sửa thông tin KH với 3 sub-tab:
- **Thông tin chung** — Các trường cơ bản
- **Đồng vay** — Thêm/xóa người vay cùng (tên, quan hệ)
- **Người liên quan** — Thêm người liên hệ khác

Nút **OCR** (biểu tượng máy quét) → Quét giấy tờ tự động điền thông tin.

#### Tab "TSBĐ" (Tài sản bảo đảm)
Quản lý tài sản thế chấp cho khoản vay. Mỗi loại tài sản có form riêng.

Thao tác: **Thêm tài sản** → Chọn loại → Điền thông tin → **Lưu**

#### Tab "Khoản vay & Tín dụng" (KHCN)
Gộp 2 sub-tab:
- **Khoản vay** — Danh sách khoản vay của KH này
- **Thông tin tín dụng** — Lịch sử vay, nợ xấu, đánh giá

#### Tab "In mẫu biểu"
- **DN:** Quản lý mapping instances cho báo cáo
- **KHCN:** Checklist tài liệu cần chuẩn bị

**Lưu ý:** Sau khi chỉnh sửa bất kỳ thông tin nào, nhấn **Lưu** → Hiện thông báo "Lưu thành công".

---

## V. Phương Án Vay (Loan Plans)

**Vào:** Chi tiết khách hàng → mục **Phương án vay vốn** (hoặc link từ sidebar)

### Danh sách phương án
Mỗi phương án hiển thị dạng card:
- Tên PA, trạng thái (Nháp/Đã duyệt), phương thức cho vay
- Số tiền vay, lợi nhuận dự kiến

### Tạo phương án mới
1. Nhấn **Tạo PA mới**
2. Nhập tên phương án (VD: "PA trồng 6 sào hoa Cát tường")
3. Chọn phương thức cho vay (Từng lần, Cột linh, v.v.)
4. Chọn mẫu PA từ danh sách (nhóm theo ngành: Nông nghiệp, Công nghiệp...)
5. Nhấn **Tạo phương án**

### Import từ Excel
- Nhấn **Nhập XLSX** → Chọn file Excel
- Hệ thống tự nhận diện cột → Hiện modal xem trước
- Xác nhận → Dữ liệu tự động điền vào PA

### Chỉnh sửa phương án
Trang chi tiết PA hiển thị:

**Thông tin chung** (dạng grid):
- Tên PA, Lãi suất (%/năm), Vòng quay vốn, Số tiền vay

**Bảng chi phí trực tiếp:**
- Mỗi dòng: Mô tả, Số lượng, Đơn giá, Thành tiền
- Nhấn **Thêm dòng** để thêm chi phí

**Bảng doanh thu dự kiến:**
- Tương tự bảng chi phí

**Tổng hợp tài chính** (tính tự động):
- Tổng CPTT, Lãi vay, Thuế, Tổng CGTC, Doanh thu DK, Lợi nhuận DK

**Nhu cầu vốn vay** (dạng cây):
- Nhu cầu vốn vay, Vốn đối ứng, Tỷ lệ vốn tự có, Tỷ lệ LN/Vốn đối ứng

Nhấn **Lưu** sau khi chỉnh sửa.

---

## VI. Khoản Vay

**Vào:** Sidebar → **Khoản vay**

### Danh sách
- Thống kê nhanh: Tổng số khoản vay, số khoản đang hoạt động, tổng tiền
- Lọc theo khách hàng (dropdown)
- Mỗi thẻ hiển thị: Số HĐ, tên KH, số tiền, thời hạn, số lần giải ngân, mục đích

### Tạo khoản vay mới
1. Nhấn **Thêm khoản vay** → Trang tạo mới
2. Chọn khách hàng
3. Nhập: Số hợp đồng, Số tiền vay (VND), Lãi suất, Ngày bắt đầu (dd/mm/yyyy), Ngày kết thúc, Số lần giải ngân, Mục đích vay
4. Nhấn **Lưu** → Chuyển đến trang chi tiết

### Chi tiết khoản vay
Hiển thị grid 4 cột: Số tiền, Lãi suất, Ngày BĐ, Ngày KT

Thống kê giải ngân: Tổng giải ngân, Số lượng, Đang hoạt động, Đã hoàn thành

**Các nút chức năng:**
- **Thông tin HĐTD** → Modal sửa thông tin hợp đồng
- **Đơn vị thụ hưởng** → Modal quản lý đơn vị nhận tiền
- **Hóa đơn** → Chuyển đến trang hóa đơn lọc theo KH này

### Giải ngân
Bảng giải ngân (phân trang 20 dòng/trang), có tìm kiếm và lọc trạng thái.

**Thêm giải ngân:** Nhấn **Thêm giải ngân** → Modal nhập số tiền, ngày, mô tả → **Lưu**

**Trên mỗi dòng giải ngân:**
- Nút **Sửa** → Modal chỉnh sửa
- Nút **Báo cáo** → Modal tạo báo cáo DOCX (chọn template UNC, BCDXGN...) → Xem trước → Tải về
- Nút **Thêm HĐ** → Modal thêm hóa đơn cho giải ngân này

---

## VII. Hóa Đơn

**Vào:** Sidebar → **Hóa đơn**

### Thống kê đầu trang
- Số HĐ cần bổ sung (cam)
- Tổng HĐ đang chờ (vàng)
- Tổng HĐ quá hạn (đỏ)
- Tổng tiền (tím)

### Customer Summary Cards
Hiển thị thẻ tóm tắt theo từng khách hàng. Click để lọc.

### Hai chế độ xem
1. **Danh sách phẳng** — Bảng hóa đơn thông thường
2. **Nhóm theo giải ngân** — Gom HĐ theo đợt giải ngân, hiển thị:
   - Số HĐ, tên KH, ngày GN
   - Thanh tiến độ (% đã bổ sung HĐ)
   - Số tiền bổ sung / Tổng tiền GN
   - Click để expand/collapse

### Lọc
- Trạng thái: Tất cả, Cần bổ sung, Đang chờ, Đã thanh toán, Quá hạn
- Khách hàng: Dropdown lọc theo KH

### Thao tác trên hóa đơn
- **Đánh dấu đã thanh toán** → Cập nhật status = Paid
- **Bổ sung** → Mở modal thêm HĐ cho giải ngân

### Chi tiết giải ngân
Từ trang khoản vay hoặc hóa đơn → Click vào giải ngân:
- Banner Thừa/Thiếu: So sánh số tiền GN vs tổng HĐ
- Bảng hóa đơn: Số HĐ, nhà cung cấp, số tiền, ngày, hạn, trạng thái, ghi chú
- Nút **Thêm hóa đơn**, **Đánh dấu đã thanh toán**, **Xóa**

---

## VIII. Mapping (Ánh xạ trường dữ liệu)

**Vào:** Sidebar → **Mapping**

Đây là trang chính để quản lý dữ liệu sẽ điền vào báo cáo DOCX.

### Thanh công cụ (Toolbar)
- **Chọn khách hàng** → Modal chọn/tạo KH → Dữ liệu KH tự động tải vào
- **Chọn template** → Modal chọn/tạo/sửa field template
- **Upload tài liệu** → Upload DOCX/PNG/JPG/PDF để OCR trích xuất dữ liệu
- **Phân tích tài chính** → Modal tính chỉ số tài chính
- **Toggle sidebar** → Mở/đóng bảng công cụ bên phải

### Vùng chính: Danh mục trường (Field Catalog)
- Hiển thị dạng cây phân nhóm (parent groups → repeater groups → fields)
- Mỗi trường hiển thị: tên, giá trị, confidence score, gợi ý OCR
- Tìm kiếm, lọc "chỉ hiện chưa ánh xạ", toggle "technical keys"

### Các thao tác trường
- Thêm/sửa/xóa trường (tên, loại, công thức)
- Tạo/sửa/đổi tên/gộp nhóm
- Kéo thả sắp xếp thứ tự
- Import nhóm trường từ template khác

### OCR — Quét tài liệu
1. Kéo thả hoặc chọn file (DOCX, ảnh, PDF) vào toolbar
2. Hệ thống quét và trích xuất dữ liệu tự động
3. Kết quả hiện trong **OCR Timeline** (log quá trình)
4. Mỗi gợi ý OCR: **Chấp nhận** hoặc **Từ chối**

### Gợi ý AI
- Nhấn nút **Gợi ý AI** trên sidebar
- Hệ thống gợi ý mapping tự động dựa trên tên trường
- Xem trước → Chấp nhận/Từ chối từng gợi ý

### Thanh trạng thái (Status Bar)
- Trái: Undo + số thao tác
- Giữa: Trạng thái OCR (pending, log)
- Phải: Tiến độ mapping (VD: 42/56 trường đã ánh xạ)

---

## IX. Template (Quản lý mẫu DOCX)

**Vào:** Sidebar → **Template**

### Tab 1: Configured (Mẫu đã cấu hình)
- Dropdown chọn mẫu DOCX đã đăng ký
- **Download DOCX** — Tải mẫu về máy
- **Mở Editor** — Chỉnh sửa trực tiếp:
  - OnlyOffice (nếu có) — Đầy đủ tính năng Word
  - Eigenpal — Editor nhẹ, luôn khả dụng
- **Mở file DOCX từ máy** — Upload mẫu mới
- **Xóa mẫu**
- **Chèn trường (Field Injection):**
  - Chọn field template → Xem danh sách trường theo nhóm
  - Copy placeholder → Dán vào mẫu DOCX trong editor

### Tab 2: Folder Browser (Duyệt thư mục mẫu)
- Cây thư mục hiển thị tất cả file DOCX trên server
- Chọn file → **Đăng ký làm mẫu** hoặc **Mở Editor**
- **Validate mẫu** — Kiểm tra placeholder hợp lệ → Xem báo cáo kết quả

### Tab 3: Build & Export
- **Chạy Build** — Biên dịch dữ liệu từ mapping vào mẫu
- **Tạo & Xem Báo cáo** — Xuất DOCX, mở trong OnlyOffice/Eigenpal
- **Tải về DOCX** — Lưu file về máy

---

## X. Người Dùng

**Vào:** Sidebar → **Người dùng**

### Tab "Cài đặt tài khoản"
- Đổi mật khẩu, cập nhật thông tin cá nhân

### Tab "Quản trị" (chỉ Admin)
- Danh sách tất cả tài khoản (tên, email, vai trò)
- **Tạo tài khoản mới:** Email + Mật khẩu + Vai trò → **Tạo**
- **Xóa tài khoản:** Chọn → Xóa → Xác nhận

---

## XI. Tác Vụ Hệ Thống

**Vào:** Sidebar → **Tác vụ hệ thống**

### Xuất dữ liệu (Quick Export)
- Nhấn **Sao lưu nhanh** → Tải xuống file JSON chứa toàn bộ dữ liệu hệ thống

### Nhập dữ liệu (Import)
1. Nhấn **Nhập file** → Chọn file `.json`
2. Hệ thống hiện modal xem trước: phiên bản, số KH, số template
3. Nhấn **Xác nhận** → Import
4. Hiện kết quả: Số KH mới, số KH cập nhật, số template nhập

---

## XII. Thông Báo

### Chuông thông báo (Sidebar)
- Biểu tượng chuông với badge đỏ = số thông báo chưa đọc
- Nhấn chuông → Danh sách thông báo → Đánh dấu đã đọc

### Loại thông báo
| Loại | Khi nào |
|------|--------|
| Sắp đến hạn | 7 ngày trước hạn thanh toán hóa đơn |
| Quá hạn | Hóa đơn quá hạn thanh toán |
| Trùng lặp | Phát hiện hóa đơn trùng số/nhà cung cấp |

Hệ thống kiểm tra tự động mỗi giờ, không gửi thông báo trùng trong 24h.

---

## XIII. Câu Hỏi Thường Gặp

**Quên mật khẩu?**
→ Liên hệ admin. Hiện chưa có tính năng tự reset.

**Không thấy KH vừa tạo?**
→ F5 tải lại trang. Hoặc kiểm tra bộ lọc loại KH (DN/CN).

**Báo cáo DOCX hiện placeholder thay vì dữ liệu?**
→ Vào **Mapping** kiểm tra trường đã có giá trị chưa. Sau đó vào **Template** → **Build & Export** → chạy **Build** lại.

**OnlyOffice không mở được?**
→ Hệ thống tự chuyển sang editor Eigenpal. Liên hệ admin nếu cần OnlyOffice.

**Import XLSX không nhận file?**
→ Đảm bảo file đúng format. Thử mở file bằng Excel kiểm tra trước.

**Viewer không thể chỉnh sửa?**
→ Đúng. Viewer chỉ có quyền xem. Liên hệ admin nâng quyền lên Editor.

**Muốn khôi phục dữ liệu cũ?**
→ Vào **Tác vụ hệ thống** → **Nhập file** → Chọn file backup JSON đã xuất trước đó.

---

**Phiên bản:** v2.0.0 | **Cập nhật:** Tháng 3/2026
