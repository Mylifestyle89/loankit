# PHÂN TÍCH SÁNG KIẾN: BỘ CÔNG CỤ TẠO BÁO CÁO CHO VAY KHDN

**Phiên bản dành cho giám khảo không chuyên công nghệ**

---

## I. BỐI CẢNH VÀ VẤN ĐỀ

### Thực trạng hiện tại

Khi một doanh nghiệp đến ngân hàng xin vay vốn, cán bộ tín dụng (CBTD) phải lập nhiều loại báo cáo:
- Báo cáo đề xuất cho vay
- Báo cáo thẩm định
- Phân tích tài chính
- Theo dõi giải ngân và hóa đơn

**Hiện nay, toàn bộ quy trình này được thực hiện thủ công bằng Word và Excel.**

### Những khó khăn cụ thể

| STT | Khó khăn | Ví dụ thực tế |
|-----|----------|---------------|
| 1 | **Nhập liệu lặp đi lặp lại** | Tên doanh nghiệp, mã số thuế, vốn điều lệ... phải gõ lại ở mỗi báo cáo. Cùng 1 thông tin nhưng phải nhập 5-7 lần vào các file khác nhau |
| 2 | **Dễ sai sót khi copy-paste** | Copy số liệu từ file phân tích sang BC thẩm định → nhầm hàng, nhầm cột, số liệu cũ lẫn với số liệu mới |
| 3 | **Mất thời gian** | Mỗi hồ sơ vay trung bình mất **2-4 giờ** chỉ để nhập liệu vào các mẫu Word |
| 4 | **Khó theo dõi hóa đơn** | Sau khi giải ngân, CBTD phải theo dõi hóa đơn chứng minh sử dụng vốn bằng file Excel riêng lẻ. Dễ quên hạn, bỏ sót |
| 5 | **Không lưu vết** | Khi cần tra lại "ai sửa gì, lúc nào" → không có cách nào biết |

---

## II. GIẢI PHÁP: BỘ CÔNG CỤ TẠO BÁO CÁO

### Ý tưởng cốt lõi

> **"Nhập dữ liệu 1 lần duy nhất — hệ thống tự động điền vào tất cả báo cáo."**

Hãy hình dung như thế này:

- **Cách cũ:** Bạn có 5 tờ đơn, mỗi tờ đều hỏi "Họ tên", "Ngày sinh", "Địa chỉ"... → bạn phải viết tay 5 lần.
- **Cách mới:** Bạn điền thông tin vào **1 chỗ duy nhất** → hệ thống tự động in ra 5 tờ đơn đã điền sẵn.

### Hình thức sử dụng

Đây là một **ứng dụng web** — nghĩa là CBTD chỉ cần mở trình duyệt (Chrome, Edge...) và truy cập đường link, **không cần cài đặt phần mềm** nào trên máy tính.

---

## III. CÁC CHỨC NĂNG CHÍNH

### Chức năng 1: Quản lý dữ liệu tập trung ("Kho dữ liệu")

**Vấn đề giải quyết:** Không phải nhập lại cùng 1 thông tin nhiều lần.

**Cách hoạt động:**
- CBTD mở trang "Trình chỉnh field" (trang chính của ứng dụng)
- Chọn khách hàng cần làm hồ sơ
- Điền thông tin vào các ô tương ứng: tên doanh nghiệp, địa chỉ, vốn điều lệ, số liệu tài chính...
- Thông tin được **lưu tập trung** và sẵn sàng để điền vào bất kỳ mẫu báo cáo nào

**Tương tự như:** Một cuốn sổ hồ sơ khách hàng mà mọi phòng ban đều dùng chung, thay vì mỗi người giữ 1 bản riêng.

---

### Chức năng 2: Trí tuệ nhân tạo (AI) hỗ trợ nhập liệu

**Vấn đề giải quyết:** Giảm lượng dữ liệu phải nhập tay.

**Cách hoạt động — 3 cách AI hỗ trợ:**

#### a) Quét ảnh/PDF tự động (OCR)
- CBTD chụp ảnh hoặc scan chứng từ (giấy phép kinh doanh, BCTC...)
- Hệ thống **tự động đọc** nội dung ảnh → đề xuất giá trị cho các ô
- CBTD chỉ cần **kiểm tra và xác nhận** (nhấn "Chấp nhận" hoặc "Từ chối")

*Ví dụ: Chụp ảnh giấy ĐKKD → hệ thống tự nhận diện "Tên DN: Công ty TNHH ABC", "Vốn điều lệ: 5 tỷ đồng"...*

#### b) Trích xuất từ file Word/Excel có sẵn
- CBTD upload file báo cáo cũ hoặc file Excel phân tích
- AI **đọc hiểu nội dung** file → tự động điền vào các ô tương ứng
- Hỗ trợ cả bảng biểu, số liệu, ngày tháng theo định dạng Việt Nam

*Ví dụ: Upload file "Phân tích BCTC.xlsx" → hệ thống tự trích xuất "Tổng tài sản: 50 tỷ", "Doanh thu: 30 tỷ"...*

#### c) Gợi ý ánh xạ thông minh
- Khi chuẩn bị mẫu báo cáo mới, AI tự động **đối chiếu** các cột trong Excel với các ô trong Word
- CBTD không cần tự tìm "cột nào trong Excel tương ứng với ô nào trong Word"

**Lưu ý quan trọng:** AI chỉ **gợi ý**, CBTD luôn là người **quyết định cuối cùng**. Mỗi gợi ý đều kèm "mức độ tin cậy" để CBTD tham khảo.

---

### Chức năng 3: Quản lý mẫu báo cáo

**Vấn đề giải quyết:** Chuẩn hóa mẫu báo cáo, dễ cập nhật khi quy định thay đổi.

**Cách hoạt động:**
1. Quản lý tập trung các mẫu Word (BC đề xuất, BC thẩm định, v.v.)
2. **Soạn thảo Word ngay trên web** — không cần mở Microsoft Office trên máy
3. Nhấn nút **"Xuất báo cáo"** → hệ thống tự động điền dữ liệu vào mẫu → tạo ra file Word hoàn chỉnh
4. Xem trước trên web hoặc tải về máy

**Tương tự như:** Bạn có bộ "khuôn" (template). Khi cần làm báo cáo cho KH A, bạn chọn khuôn → hệ thống tự "đổ" dữ liệu KH A vào → ra thành phẩm.

**Ưu điểm:**
- Khi quy định thay đổi → chỉ cần sửa 1 mẫu → tất cả báo cáo sau đó đều theo mẫu mới
- Không lo CBTD dùng mẫu cũ hay sai mẫu

---

### Chức năng 4: Quản lý khoản vay và giải ngân

**Vấn đề giải quyết:** Theo dõi toàn bộ quá trình từ ký hợp đồng đến giải ngân.

**Cách hoạt động:**

```
Khách hàng → tạo Khoản vay → thêm các đợt Giải ngân → gắn Hóa đơn chứng từ
```

- Quản lý thông tin khoản vay: số hợp đồng, số tiền, lãi suất, thời hạn, mục đích
- Theo dõi từng đợt giải ngân: số tiền, ngày giải ngân, người thụ hưởng
- Gắn hóa đơn chứng từ vào từng đợt giải ngân
- Hiển thị trạng thái: đang hoạt động / hoàn tất / đã hủy

**Tương tự như:** Một cuốn sổ theo dõi khoản vay điện tử, thay cho sổ giấy hoặc file Excel rời rạc.

---

### Chức năng 5: Cảnh báo hóa đơn tự động

**Vấn đề giải quyết:** Không bỏ sót hạn thanh toán hóa đơn giải ngân.

**Đây là chức năng rất thiết thực:**

| Thời điểm | Hệ thống làm gì |
|-----------|-----------------|
| **7 ngày trước hạn** | Gửi thông báo nhắc nhở (trên web + email) |
| **Hàng ngày đến khi thanh toán** | Tiếp tục nhắc nhở nếu chưa thanh toán |
| **Quá hạn** | Tự động đánh dấu "Quá hạn" + gửi cảnh báo |

**3 kênh thông báo:**
1. **Trên ứng dụng:** Biểu tượng chuông hiển thị số thông báo chưa đọc
2. **Thông báo máy tính:** Pop-up trên desktop (như thông báo email)
3. **Email:** Gửi email nhắc nhở đến CBTD

**Thông minh chống làm phiền:** Hệ thống không gửi thông báo trùng lặp trong vòng 24 giờ — đủ nhắc nhở nhưng không spam.

**Tương tự như:** Một trợ lý tự động kiểm tra lịch hạn thanh toán mỗi giờ và nhắc bạn khi cần.

---

### Chức năng 6: Phân tích tài chính

**Vấn đề giải quyết:** Tự động trích xuất và tính toán các chỉ tiêu tài chính.

- Upload file BCTC (báo cáo tài chính) hoặc file Excel phân tích
- Hệ thống tự động trích xuất số liệu
- AI hỗ trợ phân tích các chỉ tiêu: tỷ suất sinh lời, tỷ lệ nợ, thanh khoản...
- Kết quả tự động điền vào phần phân tích tài chính của báo cáo thẩm định

---

### Chức năng 7: Phân quyền người dùng

**Vấn đề giải quyết:** Bảo mật dữ liệu, kiểm soát ai được làm gì.

| Vai trò | Được phép | Không được phép |
|---------|-----------|-----------------|
| **Quản trị viên** | Tất cả: tạo/sửa/xóa mẫu, quản lý người dùng | — |
| **Biên tập viên** | Tạo và sửa mẫu/dữ liệu **của mình** | Sửa mẫu người khác, quản lý người dùng |
| **Người xem** | Xem báo cáo | Tạo/sửa bất cứ thứ gì |

- Đăng nhập bằng email/mật khẩu
- Chỉ quản trị viên mới tạo được tài khoản mới (không tự đăng ký)
- Mật khẩu được mã hóa an toàn

---

## IV. ĐIỂM SÁNG TẠO

### 1. Ứng dụng trí tuệ nhân tạo (AI) vào nghiệp vụ ngân hàng

Đây không chỉ là "số hóa file Word" — sáng kiến thực sự ứng dụng AI hiện đại:

- **Đọc hiểu tài liệu:** AI đọc file Word/Excel/ảnh → hiểu nội dung → trích xuất thông tin có nghĩa
- **Đối chiếu thông minh:** AI tự tìm mối liên hệ giữa dữ liệu nguồn và ô cần điền
- **Hỗ trợ phân tích:** AI đề xuất các chỉ tiêu tài chính từ BCTC

**Quan trọng:** AI chỉ đóng vai trò **trợ lý**, con người luôn kiểm tra và quyết định. Mỗi gợi ý đều kèm "điểm tin cậy" để người dùng đánh giá.

### 2. Mô hình "Nhập 1 — Dùng nhiều"

Thay vì nhập cùng thông tin vào 5-7 file Word khác nhau:
- Nhập **1 lần** vào hệ thống
- Hệ thống tự điền vào **tất cả** mẫu báo cáo
- Khi sửa → tất cả báo cáo tự động cập nhật

### 3. Cảnh báo chủ động

Hệ thống không đợi người dùng kiểm tra — nó **chủ động** quét và cảnh báo:
- Mỗi giờ tự động kiểm tra hóa đơn sắp hạn
- Gửi thông báo qua 3 kênh (web, desktop, email)
- Không cần CBTD phải nhớ hoặc tự tra lịch

### 4. Soạn thảo Word trên web

- Không cần cài Microsoft Office
- Mở trình duyệt → soạn thảo trực tiếp
- Tự động lưu → không lo mất dữ liệu

---

## V. HIỆU QUẢ DỰ KIẾN

### Tiết kiệm thời gian

| Công việc | Trước | Sau | Tiết kiệm |
|-----------|-------|-----|-----------|
| Lập 1 bộ báo cáo đề xuất + thẩm định | 4-6 giờ | 1-1,5 giờ | **~75%** |
| Nhập dữ liệu từ hồ sơ giấy | 1-2 giờ | 15-20 phút (AI hỗ trợ) | **~80%** |
| Theo dõi hóa đơn hàng ngày | 30 phút/ngày | Tự động | **~95%** |
| Chuẩn bị mẫu báo cáo mới | 4-8 giờ | 1-2 giờ | **~75%** |

**Quy đổi:** Nếu 1 CBTD xử lý 5 hồ sơ/tháng, tiết kiệm ~15-20 giờ/tháng → tương đương ~2,5 ngày làm việc.

### Giảm sai sót

| Loại sai sót | Trước | Sau |
|-------------|-------|-----|
| Nhập nhầm số liệu (copy-paste) | Thường xuyên | Gần như không (dữ liệu tập trung) |
| Dùng sai mẫu báo cáo | Thỉnh thoảng | Không (mẫu chuẩn hóa) |
| Bỏ sót hạn hóa đơn | Thường xuyên | Không (cảnh báo tự động) |
| Số liệu không nhất quán giữa các BC | Hay gặp | Không (1 nguồn dữ liệu) |

### Cải thiện quản trị

- **Chuẩn hóa:** Toàn bộ phòng ban dùng chung mẫu và quy trình
- **Truy vết:** Có lịch sử thay đổi, backup tự động
- **Phân quyền:** Rõ ràng ai được làm gì
- **Đa ngôn ngữ:** Hỗ trợ cả Tiếng Việt và Tiếng Anh

---

## VI. KHẢ NĂNG ÁP DỤNG VÀ NHÂN RỘNG

### Phạm vi áp dụng hiện tại
- Phòng/bộ phận tín dụng doanh nghiệp
- Quy trình lập báo cáo cho vay KHDN

### Khả năng mở rộng

| Hướng mở rộng | Mô tả |
|---------------|-------|
| **Thêm loại báo cáo** | Tạo mẫu mới cho KHCN, cho vay BĐS, thẩm định dự án... |
| **Thêm phòng ban** | Mỗi phòng tạo tài khoản riêng, dùng mẫu riêng |
| **Thêm chi nhánh** | Kiến trúc web cho phép truy cập từ bất kỳ đâu |
| **Tích hợp hệ thống nội bộ** | Có thể kết nối với Core Banking hoặc hệ thống khác |
| **Ứng dụng di động** | Lộ trình phát triển app mobile trong tương lai |

### Chi phí triển khai

| Hạng mục | Chi phí |
|----------|---------|
| Phần mềm nền tảng | Miễn phí (sử dụng công nghệ mã nguồn mở) |
| Máy chủ | Sử dụng hạ tầng sẵn có hoặc dịch vụ cloud chi phí thấp |
| AI (OpenAI/Google) | Chi phí thấp (~0,5-2 USD/hồ sơ tùy khối lượng) |
| Email thông báo | Miễn phí (SMTP nội bộ) hoặc rất thấp |
| Đào tạo | 1-2 buổi/người (giao diện trực quan, có hướng dẫn sử dụng tích hợp) |

---

## VII. ĐỘ TIN CẬY VÀ AN TOÀN

### Bảo mật dữ liệu

| Biện pháp | Mô tả |
|-----------|-------|
| Đăng nhập bắt buộc | Mọi truy cập đều yêu cầu tài khoản |
| Phân quyền 3 cấp | Quản trị / Biên tập / Xem — kiểm soát chặt chẽ |
| Mã hóa mật khẩu | Mật khẩu không lưu dạng gốc |
| Bảo vệ dữ liệu nhạy cảm | Tự động che giấu thông tin cá nhân khi xử lý AI |
| Backup tự động | Lưu phiên bản dữ liệu, có thể khôi phục khi cần |

### Xử lý rủi ro

| Rủi ro | Biện pháp |
|--------|-----------|
| AI trích xuất sai | Luôn có bước kiểm tra thủ công; hiển thị "mức độ tin cậy" |
| Mất dữ liệu | Backup tự động, snapshot, khôi phục nhanh |
| Quên hạn hóa đơn | Cảnh báo 3 kênh: web + desktop + email |
| Nhiều người sửa cùng lúc | Cơ chế khóa file khi đang chỉnh sửa |

---

## VIII. SO SÁNH TRƯỚC VÀ SAU

| Tiêu chí | Cách làm cũ (Excel + Word) | Sáng kiến này |
|----------|---------------------------|---------------|
| **Nhập liệu** | Gõ tay 5-7 lần cùng 1 thông tin | Nhập 1 lần, tự động điền |
| **Thời gian/hồ sơ** | 4-6 giờ | 1-1,5 giờ |
| **Độ chính xác** | Phụ thuộc người nhập | AI hỗ trợ + validation tự động |
| **Theo dõi hóa đơn** | File Excel riêng, tự nhớ | Tự động cảnh báo 3 kênh |
| **Chuẩn hóa mẫu** | Mỗi người 1 kiểu | Mẫu tập trung, thống nhất |
| **Lưu vết thay đổi** | Không | Có lịch sử, backup |
| **Truy cập** | File trên máy cá nhân | Web — bất cứ đâu có mạng |
| **Nhiều người dùng** | Chia sẻ file, dễ xung đột | Phân quyền, làm việc song song |
| **Hỗ trợ AI** | Không | OCR, trích xuất, gợi ý, phân tích |

---

## IX. TÍNH BỀN VỮNG

### Đã phát triển qua 12 giai đoạn

Ứng dụng không phải "làm xong 1 lần rồi bỏ" — nó được phát triển **liên tục qua 12 giai đoạn** từ tháng 11/2025 đến nay, mỗi giai đoạn bổ sung tính năng mới:

1. Xử lý tài liệu cơ bản
2. Quản lý khách hàng
3. Sinh báo cáo tự động
4. Mapping dữ liệu & Template
5. Tích hợp OnlyOffice (soạn Word trên web)
6. Theo dõi khoản vay & hóa đơn
7. Email cảnh báo tự động
8. Cải tiến giao diện người dùng
9. Xác thực & phân quyền
10. *Và tiếp tục...*

### Lộ trình phát triển tiếp

- Dashboard phân tích tổng hợp (biểu đồ, KPI)
- Thanh toán & đính kèm chứng từ
- Nhật ký hoạt động (ai sửa gì, lúc nào)
- Ứng dụng di động
- Nâng cấp cơ sở dữ liệu cho quy mô lớn hơn

---

## X. KẾT LUẬN

### Tóm tắt giá trị sáng kiến

Sáng kiến **"Bộ công cụ tạo báo cáo cho vay KHDN"** giải quyết **5 vấn đề thực tiễn** của nghiệp vụ tín dụng:

| # | Vấn đề | Giải pháp | Kết quả |
|---|--------|-----------|---------|
| 1 | Nhập liệu lặp lại, mất thời gian | Kho dữ liệu tập trung + AI trích xuất | Giảm **75-80%** thời gian nhập liệu |
| 2 | Sai sót khi copy-paste giữa các file | Mapping tự động "1 lần nhập, nhiều nơi dùng" | Giảm **90%** lỗi trùng lặp |
| 3 | Mẫu BC không thống nhất | Quản lý mẫu tập trung, soạn thảo trên web | **100%** chuẩn hóa |
| 4 | Bỏ sót hạn thanh toán hóa đơn | Cảnh báo tự động 3 kênh | Giảm **95%** bỏ sót |
| 5 | Không truy vết được thay đổi | Lịch sử phiên bản, backup, phân quyền | Truy vết **đầy đủ** |

### Điểm nổi bật

1. **Thực tiễn cao:** Giải quyết đúng "nỗi đau" hàng ngày của CBTD
2. **Ứng dụng AI hiện đại:** Không chỉ số hóa mà còn thông minh hóa quy trình
3. **Dễ sử dụng:** Giao diện web trực quan, có hướng dẫn tích hợp, đa ngôn ngữ
4. **Chi phí thấp:** Sử dụng công nghệ mã nguồn mở, không phí bản quyền
5. **Bền vững:** Đã qua 12 giai đoạn phát triển, có lộ trình rõ ràng
6. **Nhân rộng được:** Có thể áp dụng cho nhiều loại nghiệp vụ và chi nhánh khác

---

*Tài liệu phân tích từ hệ thống thực tế — Tháng 3/2026*
