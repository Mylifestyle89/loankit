# De xuat: Phan trang & Tim kiem Giai ngan cho man hinh Khoan vay

## Boi canh van de

Mot khach hang co the co nhieu hop dong vay, moi hop dong co hang tram khoan giai ngan. Hien tai:

- `loanService.getById()` tai **tat ca** giai ngan cung luc (khong gioi han)
- UI render het tat ca dong trong 1 bang
- Khong co tim kiem, loc, phan trang
- Voi 300+ giai ngan: query cham, JSON lon, trinh duyet lag

## Giai phap de xuat: Phan trang phia Server

Giai phap don gian nhat, khong can them thu vien, khong thay doi schema lon.

### Kien truc tong quat

```
+-----------------------------------------------------+
| Thong tin Khoan vay (so hop dong, so tien, ngay...)  |
+-----------------------------------------------------+
| Tong ket: Da giai ngan: X / Han muc: Y              |
| [Tim kiem]  [Trang thai: Tat ca v]  [Khoang ngay]   |
+-----------------------------------------------------+
| Bang Giai ngan (phan trang, 20 dong/trang)           |
| +-----+----------+--------+--------+--------+-----+ |
| | STT | So tien  | Ngay   | Mo ta  | T.thai | Xem | |
| +-----+----------+--------+--------+--------+-----+ |
| | 1   | 500tr    | ...    | ...    | Active | [>] | |
| | ... |          |        |        |        |     | |
| | 20  | 200tr    | ...    | ...    | Active | [>] | |
| +-----+----------+--------+--------+--------+-----+ |
| < Truoc  Trang 1/15  Sau >   Hien thi 1-20 / 300   |
+-----------------------------------------------------+
```

### Thay doi Schema (Prisma)

Chi them compound index, khong thay doi bang:

```prisma
model Disbursement {
  // ... cac truong hien tai giu nguyen ...
  @@index([loanId, disbursementDate])  // THEM: index kep cho phan trang nhanh
}
```

### Thay doi Service

**File:** `src/services/disbursement.service.ts`

Them method moi:

```typescript
async listByLoan(loanId: string, opts: {
  page?: number;       // mac dinh 1
  pageSize?: number;   // mac dinh 20
  status?: string;     // loc theo trang thai
  search?: string;     // tim theo mo ta
  dateFrom?: string;   // loc tu ngay
  dateTo?: string;     // loc den ngay
}) => { disbursements, total, page, pageSize }
```

Them method tong ket:

```typescript
async getSummaryByLoan(loanId: string) => {
  totalDisbursed: number;     // tong da giai ngan
  disbursementCount: number;  // so luong giai ngan
  activeCount: number;        // dang hoat dong
  completedCount: number;     // da hoan thanh
}
```

### Thay doi API

**Them route moi:** `GET /api/loans/[id]/disbursements`

Tham so query:
- `page` (so trang, mac dinh 1)
- `pageSize` (so dong/trang, mac dinh 20)
- `status` (loc: active/completed/cancelled)
- `search` (tim trong mo ta)
- `dateFrom`, `dateTo` (khoang ngay)

Tra ve:
```json
{
  "ok": true,
  "disbursements": [...],
  "total": 300,
  "page": 1,
  "pageSize": 20,
  "summary": {
    "totalDisbursed": 50000000000,
    "disbursementCount": 300,
    "activeCount": 280,
    "completedCount": 20
  }
}
```

### Thay doi UI

**File:** `src/app/report/loans/[id]/page.tsx`

1. **Tach viec tai du lieu:** Khong tai giai ngan cung voi thong tin khoan vay nua
2. **Them thanh cong cu:** O tim kiem + dropdown trang thai + chon khoang ngay
3. **Them phan trang:** Nut Truoc/Sau + chi so trang
4. **Luu trang thai vao URL:** Dung `useSearchParams` de URL chia se duoc va nut Back hoat dong dung

### Cac file can sua/tao

| File | Hanh dong | Mo ta |
|------|-----------|-------|
| `prisma/schema.prisma` | Sua | Them compound index |
| `src/services/disbursement.service.ts` | Sua | Them `listByLoan`, `getSummaryByLoan` |
| `src/services/loan.service.ts` | Sua | `getById` bo include disbursements |
| `src/app/api/loans/[id]/disbursements/route.ts` | Tao moi | API phan trang |
| `src/app/report/loans/[id]/page.tsx` | Sua | Tach fetch, them phan trang, tim kiem |
| `src/components/invoice-tracking/pagination-controls.tsx` | Tao moi | Component phan trang dung lai |

### Thu tu thuc hien

1. Them compound index `[loanId, disbursementDate]` — chay migration
2. Them `listByLoan` va `getSummaryByLoan` vao `disbursement.service.ts`
3. Tao route `GET /api/loans/[id]/disbursements` voi phan trang
4. Sua trang chi tiet khoan vay — tach fetch, them phan trang
5. Tao component `pagination-controls.tsx` dung chung
6. (Tuy chon) Them loc ngay va tim kiem sau neu can

### Danh gia rui ro

| Rui ro | Muc do | Giam thieu |
|--------|--------|------------|
| Hieu suat SQLite voi 1000+ giai ngan | Thap | Compound index + phan trang giu query < 50ms |
| Anh huong UI hien tai | Trung binh | Giu nguyen layout, chi tach cach tai du lieu |
| Do phuc tap URL state | Thap | `useSearchParams` duoc Next.js ho tro tot |
| Can migration | Thap | Chi them index, khong thay doi du lieu |

### Khong can lam (YAGNI)

- Khong can virtual scrolling (phuc tap, khong can thiet)
- Khong can full-text search (LIKE du dung voi quy mo nay)
- Khong can cache Redis (SQLite du nhanh)
- Khong can infinite scroll (nguoi dung tai chinh quen voi phan trang)
- Khong can thay doi quan he bang (schema hien tai dung)

## Trang thai

- [ ] Chua bat dau — cho xac nhan de trien khai
