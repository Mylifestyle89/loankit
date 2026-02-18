# Mapping Master 02A (chi dung data.bk + xlsm HMTD)

Pham vi:
- Nguon 1: `data.bk`
- Nguon 2: `Cong ty TNHH Thuong mai Dien tu Y_File excel phan tich BCTC va xac dinh HMTD_2024-09-23 (1).xlsm`
- Loai bo khoi mapping: toan bo nguon `BCTC xlsx`.

## Quy uoc

- `P1`: nguon uu tien 1 (uu tien dien truoc).
- `P2`: nguon du phong/bo sung.
- `Trang thai`:
  - `READY`: du de auto-fill.
  - `READY_TRANSFORM`: du du lieu, can parse/chuan hoa.
  - `PARTIAL`: co mot phan, can bo sung/nhap tay.
  - `MISSING`: chua co o ca 2 nguon.

## 1) Thong tin chung KH (Phan A)

| Field mau 02A | P1 (data.bk) | P2 (xlsm) | Trang thai | Rule dien |
|---|---|---|---|---|
| Ten khach hang | `ClientAttributes["Tên khách hàng"]` | N/A | READY | Lay P1 |
| Ma KH | `ClientAttributes["Mã khách hàng"]` | N/A | READY | Lay P1 |
| Dia chi | `ClientAttributes["Địa chỉ"]` | N/A | READY | Lay P1 |
| Linh vuc kinh doanh chinh | `ClientAttributes["Ngành nghề SXKD"]` | N/A | READY | Lay P1 |
| Von dieu le | `ClientAttributes["Vốn điều lệ"]` | `DL-IPCAS > Vốn đầu tư của CSH (411)` | READY_TRANSFORM | P1, parse so |
| Nguoi dai dien theo phap luat | `ClientAttributes["Người đại diện theo pháp luật"]` | N/A | READY | Lay P1 |
| Chuc vu nguoi dai dien | `ClientAttributes["Chức vụ"]` | N/A | READY | Lay P1 |
| Loai hinh to chuc/hinh thuc so huu | `ClientAttributes["Loại hình tổ chức"]` | N/A | READY | Lay P1 |
| Tong tai san den thoi diem bao cao | `Asset[HĐTD]["Tài sản dài hạn"]` + du lieu lien quan | `DL-IPCAS > ma 270` | READY_TRANSFORM | Uu tien xlsm ma 270 |
| Von chu so huu | `Asset[HĐTD]["Vốn chủ sở hữu"]` | `DL-IPCAS > ma 400` | READY_TRANSFORM | Neu lech, uu tien xlsm theo thoi diem tham dinh |
| Dang quan he tin dung tai TCTD | `Asset[HĐTD]["Đang QH t.dụng tại TCTD"]` | N/A | READY | Lay P1 |
| Du no tai Agribank/TCTD khac | `Asset[HĐTD]["Dư nợ tại Agribank"], ["Dư nợ tại TCTD khác"]` | `DL-IPCAS > Vay ngắn hạn (320)` | READY_TRANSFORM | Uu tien P1, doi chieu P2 |
| Nhom no gan nhat | `Asset[HĐTD]["Nhóm nợ"]` | N/A | READY | Lay P1 |
| Xep hang theo Agribank | `Asset[HĐTD]["Xếp hạng KH theo Agribank"]` | N/A | READY | Lay P1 |
| Xep hang theo CIC | `Asset[HĐTD]["Xếp hạng KH theo CIC"]` | N/A | READY | Lay P1 |

## 2) Ho so cap TD ky ke hoach

| Field mau 02A | P1 (data.bk) | P2 (xlsm) | Trang thai | Rule dien |
|---|---|---|---|---|
| Muc dich vay von | `Asset[HĐTD]["Mục đích vay"]` | `HMTD > Tong chi phi SXKD ky ke hoach (tham chieu)` | READY | Lay P1 |
| Thoi gian cho vay/thoi han HMTD | `Asset[HĐTD]["Thời hạn vay"], ["Thời hạn duy trì HMTD"]` | N/A | READY_TRANSFORM | Uu tien "Thời hạn duy trì HMTD" neu cho vay HMTD |
| Von vay Agribank de xuat | `Asset[HĐTD]["Số tiền vay"]` | `HMTD > Hạn mức vay vốn` | READY_TRANSFORM | Co 2 gia tri: han muc hien hanh va han muc mo hinh |
| Nhu cau mo L/C | `Asset[HĐTD]["Nhu cầu mở L/C"]` | N/A | READY | Lay P1 |
| Nhu cau bao lanh | `Asset[HĐTD]["Nhu cầu p/hành bảo lãnh"]` | N/A | READY | Lay P1 |
| Tong nhu cau cap TD | `Asset[HĐTD]["Tổng nhu cầu cấp TD"]` | N/A | READY | Lay P1 |

## 3) Quan tri - co dong - nguoi lien quan

| Field mau 02A | P1 (data.bk) | P2 (xlsm) | Trang thai | Rule dien |
|---|---|---|---|---|
| Danh sach lanh dao | `ClientAssets[Code=BLĐ][]` | N/A | READY | Lay P1 |
| Co dong/thanh vien >=5% | `ClientAssets[Code=CĐTV][]` | N/A | READY | Lay P1 |
| Nguoi lien quan | `ClientAssets[Code=NLQ][]` | N/A | PARTIAL | Hien co it ban ghi, cho bo sung |
| Danh sach thanh vien bo sung | `ClientAssets[Code=TV][]` | N/A | READY | Lay P1 |

## 4) Ho so kinh te, hoa don, chung tu

| Field mau 02A | P1 (data.bk) | P2 (xlsm) | Trang thai | Rule dien |
|---|---|---|---|---|
| Chung tu/hoa don dau vao | `ClientAssets[Code=HD][]` | N/A | READY | Lay P1 |
| Ben thu huong thanh toan | `ClientAssets[Code=UNC][]` | N/A | READY | Lay P1 |
| Tong gia tri hoa don de giai ngan | `Asset[GN]["Tổng giá trị hóa đơn"]` | N/A | READY | Lay P1 |
| BCTC 2 nam gan nhat | N/A | `DL-IPCAS (2022-2024), CĐKT, KQKD, LCTT` | READY | Lay xlsm (da thay xlsx) |

## 5) Quan he tin dung voi ngan hang

| Field mau 02A | P1 (data.bk) | P2 (xlsm) | Trang thai | Rule dien |
|---|---|---|---|---|
| Du no va nhom no KH vay | `Asset[HĐTD]["Dư nợ tại Agribank"], ["Nhóm nợ"]` | `DL-IPCAS > ma 320` | READY_TRANSFORM | P1 la nguon trinh bay, P2 doi chieu |
| Giao dich voi Agribank (doanh so/thu no/thu lai/chuyen tien) | `Asset[VV][...]` | `DL-IPCAS + BC NHANH TC` | READY_TRANSFORM | Uu tien P1 neu co; P2 bo sung xu huong 3 nam |
| Xep hang noi bo/Ky cham diem | `Asset[HĐTD]["Xếp hạng KH theo Agribank"], ["Kỳ chấm điểm"]` | `CSTC` (bo tro nhan xet) | READY | Lay P1 |

## 6) Tham dinh tai chinh (Phan B.I)

| Field mau 02A | P1 (data.bk) | P2 (xlsm) | Trang thai | Rule dien |
|---|---|---|---|---|
| Tai san ngan han, dai han, tong tai san | `Asset[HĐTD]` (mot phan) | `DL-IPCAS ma 100/200/270` | READY | Uu tien xlsm |
| No phai tra, no NH, no DH, VCSH | `Asset[HĐTD]` (mot phan) | `DL-IPCAS ma 300/310/330/400` | READY | Uu tien xlsm |
| Doanh thu, gia von, LN gop, LNTT | `Asset[HĐTD]["Tổng doanh thu dự kiến"...]` | `DL-IPCAS KQKD ma 10/11/20/50` | READY | Uu tien xlsm cho so thuc te |
| Chi so thanh khoan/can no/hoat dong/sinh loi | N/A | `CSTC`, `Đánh giá CSTC`, `P.tích Dupont` | READY | Lay xlsm |
| Nhan xet bien dong chi so | N/A | `Đánh giá CSTC` | READY | Tu dong goi y + can bo sua tay |

## 7) Phuong an su dung von va HMTD (Phan A.VI / B.III / VIII)

| Field mau 02A | P1 (data.bk) | P2 (xlsm) | Trang thai | Rule dien |
|---|---|---|---|---|
| Tong nhu cau von ky ke hoach | `Asset[HĐTD]["Tổng nhu cầu vốn"]` | `HMTD > VLĐ kỳ kế hoạch` | READY_TRANSFORM | P1 + doi chieu P2 |
| Von doi ung | `Asset[HĐTD]["Vốn đối ứng"]` | `HMTD > mục II (Vốn đối ứng)` | READY_TRANSFORM | Uu tien so P2 neu lap moi |
| Von vay TCTD khac | `Asset[HĐTD]["Vốn vay TCTD khác"]` | `HMTD > mục III` | READY |  |
| Han muc de xuat | `Asset[HĐTD]["Hạn mức tín dụng"]` | `HMTD > Hạn mức vay vốn` | READY_TRANSFORM | Bao cao can hien thi ca 2 (hien hanh/de xuat) |
| Tinh kha thi phuong an | mot phan tu `HĐTD` | `HMTD + Đánh giá CSTC` | PARTIAL | So lieu co, nhan xet can bo sung tay |

## 8) Bao dam tien vay (Phan A.VII/B.IV)

| Field mau 02A | P1 (data.bk) | P2 (xlsm) | Trang thai | Rule dien |
|---|---|---|---|---|
| Danh sach TSBĐ | `ClientAssets[Code=SĐ][]` | N/A | READY | Lay P1 |
| Gia tri dinh gia TSBĐ | `SĐ["Tổng giá trị TS"], ["Giá trị đất"], ["Giá trị nhà"]` | N/A | READY_TRANSFORM | Tong hop theo tung tai san |
| Nghia vu bao dam/pham vi bao dam | `SĐ["Nghĩa vụ bảo đảm"], ["Nghĩa vụ bảo đảm tối đa"]` | N/A | READY | Lay P1 |
| Muc cho vay co bao dam | `HĐTD["Số tiền vay có TSBĐ"], ["Tỷ lệ % bảo đảm"]` | N/A | READY | Lay P1 |
| Bao hiem TSBĐ | `SĐ["Mua bảo hiểm TSBĐ"]` | N/A | READY | Lay P1 |
| Tinh tranh tranh chap/thanh khoan | N/A | N/A | MISSING | Can field danh gia dinh tinh |

## 9) Cau hinh uu tien nguon de implement

- Nhom phap ly, KH, TSBĐ, CIC tom tat, thong tin khoan vay: uu tien `data.bk`.
- Nhom phan tich tai chinh, chi so, xu huong, HMTD: uu tien `xlsm` (`DL-IPCAS`, `CSTC`, `HMTD`).
- Neu lech so lieu giua 2 nguon:
  - Mac dinh hien thi so `xlsm` cho phan tham dinh tai chinh.
  - Ghi chu doi chieu vao report draft.

## 10) Field con thieu de bo sung dan

| Field | Muc do | Cach bo sung |
|---|---|---|
| Danh gia dinh tinh thi truong dau vao/dau ra | Trung binh | Form nhap tay theo checklist |
| Rui ro va bien phap giam thieu | Trung binh | Form nhap tay + goi y tu chi so |
| Bang CIC chi tiet theo tung TCTD/nguoi lien quan | Cao | Bo sung parser CIC tai lieu goc |
| Kiem tra han che/gioi han cap tin dung theo quy dinh | Cao | Rule engine theo tham so quy dinh |

