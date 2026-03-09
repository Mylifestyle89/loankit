# Hướng dẫn sử dụng – Bộ công cụ cho vay KHDN

## Giới thiệu

Ứng dụng **Bộ công cụ cho vay KHDN** giúp bạn tạo báo cáo thẩm định, quản lý hồ sơ vay vốn, và theo dõi hóa đơn giải ngân một cách tự động. Tài liệu này hướng dẫn chi tiết từng chức năng dành cho người dùng cuối.

---

## Mục lục

1. [Bắt đầu sử dụng](#1-bắt-đầu-sử-dụng)
2. [Quản lý mẫu báo cáo (Template)](#2-quản-lý-mẫu-báo-cáo)
3. [Trình chỉnh field (Mapping)](#3-trình-chỉnh-field)
4. [Build & Export báo cáo](#4-build--export-báo-cáo)
5. [Quản lý khách hàng](#5-quản-lý-khách-hàng)
6. [Khoản vay & Giải ngân](#6-khoản-vay--giải-ngân)
7. [Theo dõi hóa đơn](#7-theo-dõi-hóa-đơn)
8. [Thông báo](#8-thông-báo)
9. [Quản lý hệ thống](#9-quản-lý-hệ-thống)
10. [Câu hỏi thường gặp](#10-câu-hỏi-thường-gặp)

---

## 1. Bắt đầu sử dụng

### Truy cập ứng dụng
Mở trình duyệt và truy cập đường dẫn ứng dụng. Bạn sẽ thấy màn hình chào mừng với nút **"Mở không gian báo cáo"** để vào khu vực làm việc.

### Giao diện chính
Bên trái màn hình là **thanh điều hướng** (sidebar) với các mục:
- **Trình chỉnh field** – Quản lý dữ liệu mapping
- **Quản lý mẫu** – Quản lý mẫu DOCX (3 tab con)
- **Khách hàng** – Quản lý danh sách khách hàng
- **Khoản vay** – Quản lý hồ sơ vay
- **Hóa đơn** – Theo dõi hóa đơn giải ngân
- **Quản lý hệ thống** – Cài đặt và vận hành

### Đổi ngôn ngữ
Nhấn biểu tượng **ngôn ngữ** ở cuối thanh điều hướng để chuyển đổi giữa Tiếng Việt và English.

### Đổi giao diện sáng/tối
Nhấn biểu tượng **mặt trời/mặt trăng** để chuyển đổi giữa giao diện sáng và tối.

---

## 2. Quản lý mẫu báo cáo

Trang **Quản lý mẫu** gồm 3 tab chính:

### Tab "Chỉnh sửa mẫu"
- **Chọn mẫu**: Chọn mẫu DOCX từ dropdown để làm việc
- **Tải file DOCX**: Nhấn "Mở file DOCX" để tải mẫu về máy
- **Mở trình soạn thảo**: Nhấn "Mở Editor" để chỉnh sửa mẫu trực tiếp trên web
  - Hỗ trợ **OnlyOffice** (đầy đủ tính năng Word) hoặc **Eigenpal** (nhẹ hơn)
  - Chuyển đổi giữa 2 editor bằng nút toggle ở góc phải header
- **Chọn file từ máy**: Mở file DOCX từ máy tính để chỉnh sửa
- **Loại bỏ mẫu**: Xóa mẫu khỏi danh sách quản lý
- **Chèn trường (Field Injection)**: Chọn trường dữ liệu → nhấn "Copy" → dán vào vị trí cần thiết trong mẫu

### Tab "Duyệt folder mẫu"
- Duyệt thư mục chứa các file mẫu DOCX trên server
- Mở file để chỉnh sửa hoặc đăng ký làm mẫu mới
- **Kiểm tra mẫu**: Upload file DOCX để kiểm tra placeholder, xem báo cáo kết quả
- **Bảng tham chiếu trường**: Tra cứu tất cả trường dữ liệu có sẵn theo nhóm

### Tab "Build & Export"
- **Chạy Build Dữ Liệu**: Biên dịch dữ liệu mapping thành bản build mới nhất
- **Tạo & Xem Báo Cáo**: Xuất file DOCX hoàn chỉnh và xem trực tiếp trong OnlyOffice
- **Tải về DOCX**: Tải file báo cáo đã tạo về máy
- **Trạng thái đồng bộ**: Hiển thị dữ liệu build có đang cập nhật hay đã cũ
- **Lịch sử chạy**: Xem danh sách các lần build/export trước đó

> **Lưu ý**: Nếu dữ liệu build đã cũ, hệ thống sẽ tự động chạy Build trước khi Export.

---

## 3. Trình chỉnh field

Đây là trang **cốt lõi** của ứng dụng, nơi bạn quản lý dữ liệu sẽ được điền vào mẫu báo cáo.

### Các chức năng chính:
- **Danh mục trường (Field Catalog)**: Quản lý danh sách các trường dữ liệu, phân nhóm theo chủ đề
- **Nhập giá trị**: Điền giá trị thủ công cho từng trường hoặc dùng công thức tính tự động
- **Chọn khách hàng**: Chọn khách hàng để tải dữ liệu tương ứng
- **Chọn mẫu template**: Chọn mẫu báo cáo sẽ sử dụng
- **Import/Export**: Nhập dữ liệu từ Excel hoặc xuất ra file
- **Gợi ý AI**: Nhấn nút **AI** trên sidebar để nhận gợi ý mapping tự động
- **Nhập từ OCR**: Quét ảnh/PDF để tự động trích xuất dữ liệu
- **Validate**: Kiểm tra dữ liệu trước khi xuất báo cáo

### Cách sử dụng:
1. Chọn khách hàng và mẫu template
2. Điền hoặc import dữ liệu vào các trường
3. Nhấn **Validate** để kiểm tra
4. Chuyển sang tab **Build & Export** trong Quản lý mẫu để xuất báo cáo

---

## 4. Build & Export báo cáo

### Quy trình tạo báo cáo:
1. Đảm bảo dữ liệu mapping đã đầy đủ (trang Trình chỉnh field)
2. Vào **Quản lý mẫu** → tab **Build & Export**
3. Nhấn **"Chạy Build Dữ Liệu"** để biên dịch
4. Nhấn **"Tạo & Xem Báo Cáo"** để xuất file DOCX
5. File sẽ tự động mở trong OnlyOffice để xem/chỉnh sửa
6. Nhấn **"Tải về DOCX"** để lưu về máy

### Trạng thái đồng bộ:
- 🟢 **Đồng bộ**: Dữ liệu build khớp với mapping hiện tại
- 🟡 **Cần cập nhật**: Dữ liệu đã thay đổi kể từ lần build gần nhất → nên chạy Build lại

---

## 5. Quản lý khách hàng

### Tạo khách hàng mới
1. Vào **Khách hàng** → nhấn **Tạo mới**
2. Điền thông tin: Mã KH, Tên, Địa chỉ, Ngành nghề, Vốn điều lệ, Người đại diện, Loại hình tổ chức
3. Nhấn **Lưu**

### Chỉnh sửa khách hàng
Nhấn vào tên khách hàng trong danh sách để mở trang chỉnh sửa.

### Import/Export
- **Import**: Nhập danh sách khách hàng từ file CSV
- **Export**: Xuất dữ liệu khách hàng theo mẫu template đã chọn

---

## 6. Khoản vay & Giải ngân

### Tạo khoản vay
1. Vào **Khoản vay** → nhấn **Tạo khoản vay mới**
2. Chọn khách hàng, nhập: Số hợp đồng, Số tiền vay, Lãi suất, Ngày bắt đầu/kết thúc, Mục đích
3. Nhấn **Lưu**

### Quản lý giải ngân
Từ trang chi tiết khoản vay:
1. Nhấn **Thêm giải ngân**
2. Nhập: Số tiền, Ngày giải ngân, Mô tả
3. Mỗi đợt giải ngân có thể gắn nhiều hóa đơn

### Trạng thái:
- **Active** – Đang hoạt động
- **Completed** – Hoàn tất
- **Cancelled** – Đã hủy

---

## 7. Theo dõi hóa đơn

### Thêm hóa đơn
Từ trang giải ngân, nhấn **Thêm hóa đơn**:
- Số hóa đơn, Nhà cung cấp, Số tiền, Ngày hóa đơn, Hạn thanh toán
- Mô tả (không bắt buộc)

### Trạng thái hóa đơn:
- **Chờ thanh toán** (Pending) – Chưa đến hạn
- **Đã thanh toán** (Paid) – Đã thanh toán xong
- **Quá hạn** (Overdue) – Quá hạn thanh toán → hệ thống tự động gửi thông báo

### Theo dõi tổng quan
Trang **Hóa đơn** hiển thị:
- Tổng số hóa đơn theo trạng thái
- Tổng tiền chưa thanh toán
- Danh sách hóa đơn sắp đến hạn

---

## 8. Thông báo

Hệ thống tự động kiểm tra hạn thanh toán hóa đơn **mỗi giờ** và gửi thông báo khi:
- Hóa đơn sắp đến hạn (trước 3 ngày)
- Hóa đơn đã quá hạn

### Xem thông báo:
- Nhấn biểu tượng **chuông** trên sidebar
- Số đỏ hiển thị số thông báo chưa đọc
- Nhấn vào thông báo để xem chi tiết và đánh dấu đã đọc

---

## 9. Quản lý hệ thống

Trang **Quản lý hệ thống** cung cấp:
- Xem trạng thái hệ thống
- Quản lý backup và restore dữ liệu
- Cài đặt nâng cao

---

## 10. Câu hỏi thường gặp

### Tôi không thấy dữ liệu trong báo cáo xuất ra?
→ Kiểm tra trang **Trình chỉnh field** xem dữ liệu đã được điền đầy đủ chưa. Nhấn **Validate** để kiểm tra.

### Báo cáo hiển thị dữ liệu cũ?
→ Vào tab **Build & Export** → nhấn **"Chạy Build Dữ Liệu"** để cập nhật trước khi Export.

### Làm sao chèn trường dữ liệu vào mẫu DOCX?
→ Vào tab **Chỉnh sửa mẫu** → mở Editor → dùng thanh **Field Injection** để copy placeholder rồi dán vào vị trí cần thiết.

### OnlyOffice không hoạt động?
→ Hệ thống sẽ tự động chuyển sang editor Eigenpal. Nếu cần OnlyOffice, liên hệ quản trị viên kiểm tra cài đặt server.

### Tôi muốn quay lại phiên bản dữ liệu cũ?
→ Vào **Quản lý hệ thống** → chọn file backup → nhấn **Restore**.

---

*Tài liệu cập nhật: Tháng 3/2026*
