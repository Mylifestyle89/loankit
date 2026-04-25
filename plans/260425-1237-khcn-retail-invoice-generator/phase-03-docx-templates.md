---
phase: 03
title: DOCX Templates (4 loại)
status: completed
effort: M
completed: 2026-04-25
---

# Phase 03 — DOCX Templates

## Quan trọng: Delimiter syntax

Docxtemplater trong project dùng `[` `]` delimiters:
- Placeholder: `[field_name]`
- Loop: `[#items]`...`[/items]`
- **KHÔNG** dùng `{` `}` như default của docxtemplater

## 4 template files cần tạo

Lưu tại: `report_assets/KHCN templates/Chứng từ giải ngân/`

| File | Loại | Dựa trên mẫu |
|------|------|-------------|
| `HoaDon_TapHoa_DoUong.docx` | Tạp hóa / Đồ uống | Mau1_TapHoa_DoUong.docx |
| `HoaDon_VatLieuXayDung.docx` | Vật liệu xây dựng | Mau2_VatLieuXayDung.docx |
| `HoaDon_ThietBiYTe.docx` | Thiết bị y tế | Mau3_ThietBiYTe.docx |
| `HoaDon_NongSan.docx` | Nông sản / Phiếu bán | Mau4_NongSan.docx |

## Placeholder schema (đồng nhất 4 template)

### Header
```
[supplier_name]
[supplier_address]
[supplier_phone]
```

### Metadata box
```
Số HĐ: [invoice_number]          Ngày: [issue_date]
```

### Buyer info
```
Người mua / Họ tên Bên B: [customer_name]
Địa chỉ: [customer_address]
```

### Table — PHẦN QUAN TRỌNG (loop)

Trong Word, tạo table với header row tĩnh, sau đó 1 row template với loop:

```
| STT | Tên hàng hóa | ĐVT | Số lượng | Đơn giá (đ) | Thành tiền (đ) |
|-----|-------------|-----|----------|-------------|----------------|
| [#items][i] | [name] | [unit] | [qty] | [unit_price_fmt] | [subtotal_fmt] |[/items]
| CỘNG |     |     |          |             | [total_fmt]    |
```

> **Note:** `[#items]` và `[/items]` phải nằm trong cùng 1 cell hoặc bao quanh đúng 1 table row. Test kỹ với docxtemplater `paragraphLoop: true`.

### Footer
```
Tổng cộng: [total_fmt] đồng
Bằng chữ: [total_words]
Hình thức TT: [payment_method]   ← chỉ Mau2, Mau4
```

### Signatures
```
| NGƯỜI MUA / BÊN B | NGƯỜI BÁN / ĐẠI DIỆN |
| (Ký, ghi rõ họ tên) | (Ký tên, đóng dấu) |
```

## Placeholder khác biệt theo loại

| Field | Mau1 | Mau2 | Mau3 | Mau4 |
|-------|------|------|------|------|
| `payment_method` | — | ✓ | — | ✓ |
| `note_footer` | — | ✓ (Hàng giao tại công trình...) | — | — |
| Tiêu đề | HOÁ ĐƠN BÁN LẺ | HOÁ ĐƠN BÁN LẺ | HOÁ ĐƠN BÁN LẺ TRANG THIẾT BỊ Y TẾ | PHIẾU BÁN HÀNG / BIÊN NHẬN TIỀN |
| Cột Ghi chú | — | ✓ | ✓ | — |

## Cách tạo template Word

1. Mở file Mau1-4.docx gốc làm tham chiếu layout
2. Tạo file mới, giữ nguyên layout/font
3. Thay toàn bộ dữ liệu mẫu bằng placeholders `[xxx]`
4. Với bảng: giữ header row tĩnh, thêm 1 row với `[#items]...[/items]`
5. Xóa các row mẫu dữ liệu cứng (bia, xi măng, v.v.)
6. Lưu .docx

## Todo

- [ ] Tạo `HoaDon_TapHoa_DoUong.docx` với placeholders
- [ ] Tạo `HoaDon_VatLieuXayDung.docx` (thêm cột Ghi chú + payment_method)
- [ ] Tạo `HoaDon_ThietBiYTe.docx` (thêm cột Ghi chú, tiêu đề khác)
- [ ] Tạo `HoaDon_NongSan.docx` (Phiếu bán hàng + payment_method)
- [ ] Test render với docxtemplater locally (unit test nhỏ hoặc script)

## Risk

- `[#items]...[/items]` trong table row có thể bị docxtemplater split ra nhiều XML runs → cần `mergeAdjacentRuns` (đã có trong docx-engine)
- Nếu loop không hoạt động trong table, fallback: dùng fixed 10 rows với `[item_1_name]`, `[item_2_name]`, ... (xấu hơn nhưng chắc chắn)
