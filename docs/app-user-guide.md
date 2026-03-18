# Hướng Dẫn Sử Dụng BCDXCV - Ứng Dụng Quản Lý Tài Chính Ngân Hàng

## Giới thiệu

BCDXCV là ứng dụng quản lý tài chính và cho vay dành cho nhân viên ngân hàng. Ứng dụng giúp bạn:

- Quản lý khách hàng KHCN (khách hàng cá nhân) và hồ sơ vay vốn
- Tạo phương án vay vốn (loan plans) từ dữ liệu Excel tự động
- Theo dõi tài sản bảo đảm (collateral) theo 7 danh mục khác nhau
- Quản lý khoản vay, giải ngân, và hóa đơn
- Xuất báo cáo DOCX tự động với dữ liệu điền sẵn
- Quét và nhập dữ liệu từ ảnh/PDF bằng OCR
- Ánh xạ trường dữ liệu (mapping) giữa nguồn dữ liệu và mẫu báo cáo

---

## Tổng Quan Chức Năng

| Chức Năng | Mô Tả |
|-----------|-------|
| **Đăng nhập** | Email/mật khẩu. Admin toàn quyền, Editor chỉnh sửa, Viewer chỉ xem |
| **Khách hàng** | CRUD khách hàng KHCN, xem chi tiết hồ sơ, tài sản, đồng vay |
| **Phương án vay** | Tạo/sửa/xóa loan plans, parse XLSX tự động, tính chi phí |
| **Tài sản bảo đảm** | Quản lý 7 loại tài sản (đất, giấy tờ, khuôn viên, v.v.) |
| **Khoản vay** | Quản lý hợp đồng vay, số tiền, lãi suất, ngày hạn |
| **Giải ngân** | Tạo đợt giải ngân, gắn hóa đơn, theo dõi trạng thái |
| **Hóa đơn** | Nhập hóa đơn, hạn thanh toán tự động, cảnh báo quá hạn |
| **Báo cáo** | Xuất file DOCX, xem trước, ánh xạ trường dữ liệu |
| **Template** | Quản lý mẫu DOCX, field injection, chỉnh sửa trực tuyến |
| **OCR** | Quét tài liệu, tự động trích xuất dữ liệu |
| **Người dùng** | Admin quản lý tài khoản, phân quyền (admin/editor/viewer) |

---

## I. Đăng Nhập & Phân Quyền

### Đăng nhập
1. Mở ứng dụng
2. Nhập **Email** và **Mật khẩu**
3. Nhấn **Đăng nhập**

Nếu quên mật khẩu, liên hệ quản trị viên.

### Phân quyền
- **Admin**: Toàn bộ quyền, quản lý người dùng
- **Editor**: Tạo/sửa khách hàng, báo cáo, khoản vay
- **Viewer**: Chỉ xem dữ liệu, không sửa

---

## II. Quản Lý Khách Hàng (KHCN)

### Danh sách khách hàng
**Vào:** Menu → Khách hàng

Trang danh sách hiển thị tất cả KHCN, có thể tìm kiếm theo tên hoặc mã khách.

### Tạo khách hàng mới
1. Nhấn **Tạo mới** (dấu cộng hoặc nút Create)
2. Nhập thông tin:
   - **Mã khách** (customer_code)
   - **Tên khách** (customer_name)
   - **Địa chỉ** (address)
3. Nhấn **Lưu**

### Chi tiết khách hàng
Nhấn vào tên khách để xem trang chi tiết với các tab:

#### **Tab Thông tin cá nhân**
- Họ tên, ngày sinh, CMND/CCCD
- Địa chỉ thường trú, liên hệ
- Chỉnh sửa thông tin bằng nút Edit

#### **Tab Tài sản bảo đảm** (Collateral)
Quản lý 7 danh mục tài sản:
1. **Đất** (tai_san) - Mảnh đất, giấy tờ pháp lý
2. **Giấy tờ pháp lý** (ts_glvd)
3. **Tài sản quỹ sử dụng** (ts_qsd)
4. **Tài sản phục vụ giáo dục** (ts_ptgt)
5. **Tài sản bảo hộ** (bv) - Biểu chứng
6. **Tài sản bảo vệ tiêu chuẩn 1** (bt3_1)
7. **Tài sản bảo vệ tiêu chuẩn 2** (bt3_2)

Mỗi danh mục có thể thêm/sửa/xóa mục. Nhấn **Thêm tài sản** → chọn loại → điền thông tin → **Lưu**

#### **Tab Đồng vay (Co-borrower)**
Thêm người vay cùng, xóa đồng vay.
- Nhấn **Thêm đồng vay** → nhập tên, quan hệ → **Lưu**

#### **Tab Người liên quan (Related Person)**
Thêm thông tin liên lạc khác (anh/chị/em, bạn, v.v.)

#### **Tab Thông tin tín dụng (Credit Info)**
- Lịch sử vay trước
- Nợ xấu, khiếu nại
- Đánh giá tín dụng

#### **Tab Thành viên chi nhánh (Branch/Staff)**
- Nhân viên quản lý khách hàng
- Chi nhánh phụ trách

### Import khách hàng từ BK
1. Vào **Khách hàng**
2. Nhấn **Import từ BK file**
3. Chọn file `.bk`
4. Hệ thống sẽ tự động nhập dữ liệu từ BK
5. Xem kết quả import

---

## III. Quản Lý Phương Án Vay (Loan Plans)

### Danh sách phương án vay
**Vào:** Khách hàng → Chi tiết → Tab Phương án vay

### Tạo phương án vay mới
1. Nhấn **Tạo mới**
2. Chọn khách hàng
3. **Cách 1: Nhập thủ công**
   - Điền tên, thời hạn, lãi suất, các chi phí
   - Nhấn **Lưu**

4. **Cách 2: Parse từ Excel (XLSX)**
   - Nhấn **Import XLSX**
   - Chọn file Excel có định dạng loan plan
   - Hệ thống sẽ tự động nhận diện cột, tính toán chi phí
   - Xem trước dữ liệu → **Lưu**

### Chỉnh sửa chi tiết phương án
1. Nhấn vào phương án cần sửa
2. Bảng chi phí: Thêm/sửa/xóa mục (chi phí giấy tờ, bảo hiểm, v.v.)
3. **Tính toán tự động:**
   - Tổng chi phí = sum(cost items)
   - Lãi suất thực tế = (Lãi + Phí) / Vốn gốc
4. Nhấn **Cập nhật** khi thay đổi

---

## IV. Quản Lý Khoản Vay & Giải Ngân

### Danh sách khoản vay
**Vào:** Menu → Khoản vay

### Tạo khoản vay
1. Nhấn **Tạo khoản vay mới**
2. Chọn khách hàng
3. Nhập:
   - **Số hợp đồng** (contract_number)
   - **Số tiền vay** (amount) - VND
   - **Lãi suất** (interest_rate) - % năm
   - **Ngày bắt đầu** (start_date)
   - **Ngày kết thúc** (end_date)
   - **Mục đích vay** (purpose)
4. Nhấn **Lưu**

### Chi tiết khoản vay
Nhấn vào số hợp đồng để xem:
- Thông tin hợp đồng
- Danh sách giải ngân
- Tổng số tiền, đã giải ngân, còn lại
- Trạng thái: Active / Completed / Cancelled

### Quản lý giải ngân (Disbursement)
Từ trang khoản vay:

1. **Thêm giải ngân mới**
   - Nhấn **Thêm giải ngân**
   - Nhập số tiền, ngày giải ngân, mô tả
   - Nhấn **Lưu**

2. **Chi tiết giải ngân**
   - Nhấn vào số tiền để xem chi tiết
   - Xem danh sách hóa đơn gắn với giải ngân
   - Tạo file báo cáo DOCX nếu có template

3. **Xuất báo cáo DOCX**
   - Trong chi tiết giải ngân, nhấn **Generate Report**
   - Chọn template (UNC, BCDXGN, v.v.)
   - Hệ thống sẽ tự động điền dữ liệu vào mẫu
   - Xem trước → **Tải về** hoặc **Chỉnh sửa tiếp**

4. **Xem trước DOCX (DOCX Preview)**
   - Báo cáo tự động mở trong trình xem
   - Có thể chỉnh sửa nếu cần
   - Lưu hoặc tải về

---

## V. Theo Dõi Hóa Đơn & Hạn Thanh Toán

### Danh sách hóa đơn
**Vào:** Menu → Hóa đơn

Hiển thị:
- Tổng hóa đơn chờ thanh toán
- Tổng tiền chưa thanh toán
- Sắp hết hạn (3 ngày nữa)
- Quá hạn

### Thêm hóa đơn
Từ trang **Giải ngân**:

1. Nhấn **Thêm hóa đơn**
2. Nhập:
   - **Số hóa đơn** (invoiceNumber)
   - **Nhà cung cấp** (supplierName)
   - **Số tiền** (amount)
   - **Ngày hóa đơn** (issueDate)
   - **Hạn thanh toán** (dueDate) - Tự động = issueDate + 1 tháng
   - Có thể ghi đè hạn thanh toán nếu cần
3. Nhấn **Lưu**

### Trạng thái hóa đơn
| Trạng Thái | Ý Nghĩa |
|-----------|--------|
| **Pending** | Chờ thanh toán (chưa đến hạn) |
| **Paid** | Đã thanh toán |
| **Overdue** | Quá hạn → Cảnh báo tự động |

### Cập nhật trạng thái
1. Nhấn vào hóa đơn
2. Chọn trạng thái mới
3. Nhấn **Cập nhật**

### Cảnh báo tự động
- **Sắp hết hạn**: 7 ngày trước hạn → Thông báo
- **Quá hạn**: Ngay khi qua hạn → Cảnh báo email + app
- Dung lượng: 24 giờ không trùng lặp

---

## VI. Báo Cáo & Xuất Tài Liệu DOCX

### Trang Mapping (Ánh xạ trường dữ liệu)
**Vào:** Menu → Mapping

Đây là nơi quản lý dữ liệu sẽ được điền vào báo cáo DOCX.

#### **Thanh công cụ (Toolbar)**
- **Chọn khách hàng** - Lấy dữ liệu từ khách hàng
- **Chọn template** - Mẫu báo cáo sẽ sử dụng
- **Upload tài liệu** - Nhập dữ liệu từ file
- **Phân tích tài chính** - Tính các chỉ số tài chính
- **Toggle sidebar** - Mở/đóng bảng điều khiển bên cạnh

#### **Danh mục trường (Field Catalog)**
Danh sách tất cả trường dữ liệu sắp xếp theo nhóm:
- **Khách hàng**: Tên, địa chỉ, CMND
- **Tài sản**: Giá trị, loại
- **Tài chính**: Thu nhập, chi phí, tài sản ròng
- **Vay vốn**: Số tiền, lãi suất, hạn

#### **Nhập dữ liệu**
1. Chọn khách hàng từ toolbar
2. Dữ liệu sẽ tự động tải vào
3. Chỉnh sửa các trường còn thiếu hoặc sai
4. Nhấn **Validate** để kiểm tra

#### **Import Excel/CSV**
1. Nhấn **Import/Export** trong sidebar
2. Chọn file CSV hoặc Excel
3. Ánh xạ cột với trường dữ liệu
4. Nhấn **Import**

#### **Gợi ý AI (AI Suggestions)**
1. Nhấn nút **AI** trong sidebar
2. Hệ thống sẽ gợi ý mapping tự động dựa trên tên trường
3. Xem trước gợi ý → **Chấp nhận** hoặc **Từ chối**

#### **OCR - Quét tài liệu**
1. Nhấn **Upload ảnh/PDF** trong toolbar
2. Chọn tài liệu (CMND, giấy tờ tài chính, v.v.)
3. Hệ thống sẽ quét và trích xuất dữ liệu
4. Xem kết quả OCR → Chỉnh sửa nếu sai → **Lưu**

### Xuất báo cáo DOCX
**Vào:** Menu → Template → Tab **Build & Export**

1. **Chạy Build Dữ liệu** - Biên dịch dữ liệu hiện tại
2. **Tạo & Xem Báo cáo** - Xuất file DOCX
3. **Xem trước** - File tự động mở (OnlyOffice hoặc trình xem)
4. **Tải về** - Lưu file vào máy
5. **Chỉnh sửa tiếp** - Sửa trong OnlyOffice nếu cần

---

## VII. Quản Lý Template DOCX & Field Mapping

### Trang Template Management
**Vào:** Menu → Template

Gồm **4 tab chính**:

#### **Tab 1: Chỉnh sửa mẫu (Edit Templates)**
- **Chọn mẫu**: Dropdown danh sách mẫu DOCX
- **Tải file DOCX**: Download mẫu để chỉnh sửa ngoài
- **Mở Editor**: Chỉnh sửa trực tiếp trên web
  - OnlyOffice: Đầy đủ tính năng Word
  - Eigenpal: Nhẹ hơn, tương thích cơ bản
- **Chèn trường (Field Injection)**:
  - Xem danh sách trường có sẵn
  - Copy placeholder (ví dụ: `{{customer.name}}`)
  - Dán vào mẫu DOCX

#### **Tab 2: Duyệt folder mẫu (Template Folder Browser)**
- Xem cấu trúc thư mục trên server
- Chọn file DOCX để:
  - Mở Editor chỉnh sửa
  - **Validate mẫu** - Kiểm tra placeholder có hợp lệ không
  - Xem báo cáo kết quả validation

#### **Tab 3: Tra cứu trường (Field Reference)**
- Bảng danh sách tất cả trường dữ liệu
- Sắp xếp theo nhóm (Group)
- Hiển thị: Tên trường, loại dữ liệu, mô tả
- Sao chép placeholder để dùng trong mẫu

#### **Tab 4: Build & Export Báo cáo**
1. **Chạy Build Dữ liệu**
   - Biên dịch dữ liệu từ mapping
   - Trạng thái: Đang cập nhật → Xong

2. **Tạo & Xem Báo cáo**
   - Xuất file DOCX với dữ liệu đã điền
   - File mở tự động trong OnlyOffice

3. **Tải về DOCX**
   - Lưu báo cáo vào máy tính

4. **Trạng thái đồng bộ**
   - 🟢 **Synced**: Dữ liệu khớp
   - 🟡 **Needs Update**: Cần chạy Build lại

5. **Lịch sử chạy (Run History)**
   - Danh sách các lần Build/Export trước đó
   - Có thể tái sử dụng (re-run)

---

## VIII. Thông Báo & Cảnh Báo

### Biểu tượng chuông (Notification Bell)
- Vị trí: Sidebar phải
- Số đỏ = Số thông báo chưa đọc

### Loại thông báo
| Loại | Khi nào |
|------|--------|
| **Invoice Due Soon** | 7 ngày trước hạn thanh toán |
| **Invoice Overdue** | Quá hạn thanh toán |
| **Duplicate Invoice** | Phát hiện hóa đơn trùng |

### Xem & Quản lý thông báo
1. Nhấn biểu tượng chuông
2. Danh sách thông báo sẽ hiển thị
3. Nhấn thông báo → Xem chi tiết → Đánh dấu đã đọc
4. Nhấn **Xóa** để xóa thông báo

### Email thông báo
- Nếu có email cấu hình, hệ thống sẽ gửi email cảnh báo
- Email về hóa đơn sắp hết hạn hoặc quá hạn
- Bạn có thể đặt email khách hàng để gửi cảnh báo cho họ

---

## IX. Quản Lý Người Dùng (Admin)

### Trang Quản lý người dùng
**Vào:** Menu → Quản lý người dùng (chỉ admin)

### Danh sách người dùng
- Xem tất cả tài khoản
- Tên đăng nhập, email, vai trò

### Tạo người dùng mới
1. Nhấn **Tạo tài khoản mới**
2. Nhập:
   - **Email** (dùng để đăng nhập)
   - **Mật khẩu** (ít nhất 8 ký tự)
   - **Vai trò** (admin / editor / viewer)
3. Nhấn **Tạo**

### Xóa người dùng
1. Chọn người dùng
2. Nhấn **Xóa**
3. Xác nhận

### Vai trò & quyền

| Vai trò | Tạo khách hàng | Tạo khoản vay | Xuất báo cáo | Quản lý người dùng |
|---------|---|---|---|---|
| **Admin** | ✓ | ✓ | ✓ | ✓ |
| **Editor** | ✓ | ✓ | ✓ | ✗ |
| **Viewer** | ✗ | ✗ | ✗ | ✗ |

---

## X. Các Công Cụ Nâng Cao

### Phân tích tài chính (Financial Analysis)
1. Vào **Mapping**
2. Nhấn **Phân tích tài chính** trong toolbar
3. Chọn mẫu phân tích
4. Hệ thống sẽ tính:
   - Chỉ số hiệu quả kinh doanh
   - Khả năng thanh toán
   - Rủi ro
5. Xem kết quả → Export

### Backup & Restore
**Vào:** Menu → Quản lý hệ thống

1. **Backup**
   - Nhấn **Sao lưu dữ liệu**
   - Chọn các thành phần (khách hàng, khoản vay, báo cáo)
   - Hệ thống sẽ tạo file backup
   - Download về máy

2. **Restore**
   - Nhấn **Phục hồi dữ liệu**
   - Chọn file backup
   - Xác nhận
   - Dữ liệu sẽ được khôi phục

### Snapshot & Restore Mapping
**Vào:** Mapping → Sidebar → Backup/Restore

- Lưu trạng thái mapping hiện tại (snapshot)
- Quay lại snapshot cũ nếu cần (max 5 snapshots)

---

## XI. Câu Hỏi Thường Gặp (FAQ)

### Tôi quên mật khẩu làm sao?
→ Liên hệ admin để đặt lại mật khẩu.

### Tôi không thấy khách hàng mà vừa tạo?
→ Tải lại trang (F5 hoặc Ctrl+Shift+R). Hoặc logout → login lại.

### Dữ liệu trong báo cáo xuất ra không đúng?
→ Kiểm tra trang **Mapping** xem dữ liệu đã đầy đủ và đúng chưa. Nhấn **Validate**.

→ Nếu dữ liệu đúng, vào **Template** → **Build & Export** → Chạy **Build Dữ liệu** lại.

### Báo cáo DOCX hiển thị placeholder `{{field.name}}` thay vì dữ liệu?
→ Placeholder chưa được ánh xạ. Vào **Template** → **Field Reference** → Xem danh sách trường hợp lệ.

→ Hoặc dữ liệu chưa điền. Vào **Mapping** → Điền dữ liệu → Chạy Build lại.

### OnlyOffice không hoạt động?
→ Hệ thống sẽ tự động sử dụng editor Eigenpal (nhẹ hơn).

→ Nếu cần OnlyOffice, kiểm tra kết nối mạng hoặc liên hệ admin.

### Làm sao tạo phương án vay từ Excel?
→ Vào chi tiết khách hàng → Tab **Phương án vay** → Nhấn **Import XLSX**.

→ Chọn file Excel → Hệ thống sẽ tự động nhận diện cột (Tên, Chi phí, Lãi suất, v.v.) → **Lưu**.

→ File Excel phải có format chuẩn (xem mẫu trong app).

### Hóa đơn sắp hết hạn nhưng không có thông báo?
→ Kiểm tra email cấu hình. Admin có thể cần bật cron job.

→ Hoặc vào **Hóa đơn** trang xem danh sách hóa đơn chưa thanh toán.

### Tôi muốn quay lại phiên bản dữ liệu cũ?
→ Vào **Mapping** → Sidebar → **Snapshot/Restore** → Chọn snapshot cũ → **Restore**.

→ Hoặc vào **Quản lý hệ thống** → **Backup/Restore** → Chọn file backup cũ.

### Tôi là Viewer, tại sao không thể tạo khách hàng?
→ Viewer chỉ có quyền xem dữ liệu. Liên hệ admin để nâng quyền lên Editor hoặc Admin.

---

## XII. Hỗ Trợ & Liên Hệ

Nếu gặp vấn đề không được giải quyết trong FAQ, vui lòng:
- Liên hệ **admin@company.com**
- Hoặc nhấn nút **Help** trong app (nếu có)
- Cung cấp: Mô tả vấn đề, bước tái tạo, ảnh chụp màn hình

---

**Cập nhật:** Tháng 3/2026
**Phiên bản:** v2.0.0 (KHCN Implementation Complete)
