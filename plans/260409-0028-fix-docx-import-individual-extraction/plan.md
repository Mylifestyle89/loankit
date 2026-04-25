# Fix DOCX Import: Mở Rộng Extraction + Fix Review UI (Individual)

**Created:** 2026-04-09
**Priority:** P1
**Status:** Ready
**Scope:** Cá nhân (individual) only — defer corporate

## Big Picture

Scout report xác định DOCX import hiện chỉ extract ~34% fields của Customer model. User cũng báo bug UX: khi chỉnh sửa trong review modal, input bị re-render mất focus. Cả 2 đều fix trong plan này.

## Root Causes

### RC-1: Extraction prompt hard-code 12 customer fields
[src/services/customer-docx-extraction.service.ts:57-94](src/services/customer-docx-extraction.service.ts#L57-L94) khóa cứng schema 12 fields. Gemini làm đúng prompt nên không thể extract thêm. Co-borrowers chưa có trong schema. Loans chỉ 6/30+ fields.

### RC-2: FieldSection filter unmount input khi value rỗng (BUG UX)
[src/components/customers/customer-docx-import-modal.tsx:364-367](src/components/customers/customer-docx-import-modal.tsx#L364-L367):
```ts
const entries = Object.entries(labels).filter(([key]) => {
  const val = data[key];
  return val !== undefined && val !== "" && val !== 0;
});
```
**Hậu quả:**
- User xoá hết text → `val === ""` → entry bị filter → input unmount → focus mất
- Fields rỗng ban đầu KHÔNG HIỂN THỊ → user không thể điền thủ công field AI bỏ sót
- Mỗi keystroke qua `setExtracted` → spread clone state → re-render toàn modal → FieldSection recompute entries → nếu filter flip thì remount input

### RC-3: handleSubmit nhét column thật vào data_json (BUG data modeling)
[customer-docx-import-modal.tsx:148-156](src/components/customers/customer-docx-import-modal.tsx#L148-L156) nhét `cccd_issued_date`, `cccd_issued_place`, `gender`, `marital_status`, `spouse_name`, `spouse_cccd` vào `data_json` — nhưng đây là **cột thật** trong Customer model. POST `/api/customers` schema hiện chưa accept các field này nên hàm này workaround bằng data_json. Kết quả: UI list không hiển thị đúng, search không work, mask PII không áp dụng.

## Phases

### Phase 1 — Fix Review UI Re-render Bug (CRITICAL UX)

**File:** [src/components/customers/customer-docx-import-modal.tsx](src/components/customers/customer-docx-import-modal.tsx)

**Thay đổi:**
1. Bỏ filter trong `FieldSection` — luôn render tất cả labels, kể cả field rỗng, để user điền thủ công:
```ts
function FieldSection({ title, labels, data, onChange }: Props) {
  const entries = Object.entries(labels); // no filter
  return (
    <div>
      <h4>{title}</h4>
      <div className="grid gap-2">
        {entries.map(([key, label]) => (
          <label key={key} className="flex items-center gap-3">
            <span className="w-32 shrink-0">{label}</span>
            <input
              value={String(data[key] ?? "")}
              onChange={(e) => onChange(key, e.target.value)}
              className="..."
            />
          </label>
        ))}
      </div>
    </div>
  );
}
```

2. **Modularize:** modal đang 388 LOC → tách:
   - `customer-docx-import-modal.tsx` — main component + state
   - `customer-docx-import-modal-field-section.tsx` — FieldSection + field labels consts
   - `customer-docx-import-modal-submit.ts` — handleSubmit logic (POST customer + loans + collaterals + co-borrowers)

3. Wrap `FieldSection` với `React.memo` để tránh re-render chéo giữa các sections (khi edit 1 field trong customer section, không cần re-render loans/collaterals sections).

**Success criteria:**
- Gõ, xoá, paste text vào bất kỳ input nào — không mất focus
- Field rỗng hiển thị input trắng để user điền
- Không có input nào disappear khi clear

### Phase 2 — Mở Rộng Extraction Service (Individual)

**File:** [src/services/customer-docx-extraction.service.ts](src/services/customer-docx-extraction.service.ts)

**2.1 Thêm 4 customer fields:**
```ts
export type ExtractedCustomer = {
  // ... 12 existing ...
  cccd_old: string;       // CMND 9 số
  bank_account: string;   // Số TK nhận giải ngân
  bank_name: string;      // Tên NH TK nhận
  email: string;
};
```

**2.2 Mở rộng loan schema (+8 fields):**
```ts
export type ExtractedLoan = {
  contract_number: string;
  loan_amount: number;
  interest_rate: number;
  purpose: string;
  start_date: string;
  end_date: string;
  // NEW
  loan_method: string;           // tung_lan | han_muc | trung_dai | tieu_dung
  lending_method: string;        // Phương thức cho vay
  principal_schedule: string;    // Định kỳ trả gốc
  interest_schedule: string;     // Định kỳ trả lãi
  total_capital_need: number;    // Tổng nhu cầu vốn
  equity_amount: number;         // Vốn đối ứng
  expected_revenue: number;      // Doanh thu dự kiến
  expected_profit: number;       // Lợi nhuận dự kiến
};
```

**Skip loan fields:** `customer_rating`, `debt_group`, `scoring_period` — từ CIC, không có trong DOCX khách.

**2.3 Thêm `ExtractedCoBorrower` (entity mới):**
```ts
export type ExtractedCoBorrower = {
  full_name: string;
  id_number: string;           // CCCD mới
  id_old: string;              // CMND cũ
  id_issued_date: string;
  id_issued_place: string;
  birth_year: string;
  phone: string;
  current_address: string;
  permanent_address: string;
  relationship: string;        // Vợ/Chồng/Con/...
};

export type ExtractionResult = {
  customer: Partial<ExtractedCustomer>;
  loans: Partial<ExtractedLoan>[];
  collaterals: Partial<ExtractedCollateral>[];
  co_borrowers: Partial<ExtractedCoBorrower>[]; // NEW
};
```

**2.4 Cập nhật `EXTRACTION_PROMPT`:**
- Thêm 4 customer fields mới vào JSON schema trong prompt
- Thêm 8 loan fields mới
- Thêm section `co_borrowers: [...]` với instruction: "Tìm người đồng vay/đồng trả nợ (thường là vợ/chồng hoặc thành viên gia đình). Nếu không có, trả mảng rỗng."
- Thêm note: "Nếu gender ghi 'Nam/Nữ', chuẩn hoá về 'male'/'female'."
- Thêm note về bank_account: "Chỉ extract số TK chính thức, không lấy số TK giải ngân tạm thời."

**2.5 Update `mergeExtractionResults`:**
- Merge co_borrowers với dedupe theo `id_number` hoặc `full_name`

### Phase 3 — Update Modal UI + handleSubmit

**File:** [src/components/customers/customer-docx-import-modal.tsx](src/components/customers/customer-docx-import-modal.tsx) (+ module tách từ Phase 1)

**3.1 Mở rộng labels constants:**
```ts
const CUSTOMER_LABELS = {
  // ... existing 12 ...
  cccd_old: "CMND cũ",
  bank_account: "Số TK nhận",
  bank_name: "NH TK nhận",
  email: "Email",
};

const LOAN_LABELS = {
  // ... existing 6 ...
  loan_method: "Phương thức vay",
  lending_method: "PT cho vay",
  principal_schedule: "Kỳ trả gốc",
  interest_schedule: "Kỳ trả lãi",
  total_capital_need: "Tổng nhu cầu vốn",
  equity_amount: "Vốn đối ứng",
  expected_revenue: "Doanh thu dự kiến",
  expected_profit: "Lợi nhuận dự kiến",
};

const COBORROWER_LABELS = {
  full_name: "Họ tên",
  id_number: "CCCD",
  id_old: "CMND cũ",
  birth_year: "Năm sinh",
  phone: "SĐT",
  current_address: "Địa chỉ hiện tại",
  permanent_address: "Thường trú",
  relationship: "Quan hệ",
};
```

**3.2 Thêm `updateCoBorrowerField` + render section trong review step:**
```tsx
{extracted.co_borrowers.map((cob, i) => (
  <FieldSection
    key={`cob-${i}`}
    title={`Người đồng vay ${extracted.co_borrowers.length > 1 ? i + 1 : ""}`}
    labels={COBORROWER_LABELS}
    data={cob}
    onChange={(k, v) => updateCoBorrowerField(i, k, v)}
  />
))}
```

**3.3 Fix handleSubmit — dùng cột thật thay vì data_json:**
```ts
// 1) Create customer — gửi TẤT CẢ fields, không nhét vào data_json
const custRes = await fetch("/api/customers", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customer_name: c.customer_name || "Chưa xác định",
    customer_code: c.customer_code || `DOCX-${Date.now()}`,
    customer_type: "individual",
    cccd: c.cccd || null,
    cccd_old: c.cccd_old || null,
    cccd_issued_date: c.cccd_issued_date || null,
    cccd_issued_place: c.cccd_issued_place || null,
    date_of_birth: c.date_of_birth || null,
    gender: c.gender || null,
    phone: c.phone || null,
    address: c.address || null,
    email: c.email || null,
    bank_account: c.bank_account || null,
    bank_name: c.bank_name || null,
    data_json: {
      marital_status: c.marital_status,
      spouse_name: c.spouse_name,
      spouse_cccd: c.spouse_cccd,
      import_source: "docx",
    },
  }),
});
```

**Chú ý:** POST `/api/customers` createCustomerSchema hiện chưa accept các field mở rộng → cần update schema trong [src/app/api/customers/route.ts](src/app/api/customers/route.ts). Xem Phase 3.4.

**3.4 Mở rộng `createCustomerSchema` trong POST /api/customers:**
```ts
const createCustomerSchema = z.object({
  // ... existing ...
  cccd_old: z.string().optional().nullable(),
  cccd_issued_date: z.string().optional().nullable(),
  cccd_issued_place: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  bank_account: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
});
```
Verify `customerService.createCustomer` có forward các field này vào Prisma create không. Nếu schema Prisma đã có cột (đã check: có), chỉ cần update service để spread.

**3.5 Thêm POST co-borrowers sau khi tạo customer:**
```ts
const cobPromises = extracted.co_borrowers
  .filter((cob) => cob.full_name)
  .map((cob) =>
    fetch(`/api/customers/${customerId}/co-borrowers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: cob.full_name,
        id_number: cob.id_number || null,
        id_old: cob.id_old || null,
        birth_year: cob.birth_year || null,
        phone: cob.phone || null,
        current_address: cob.current_address || null,
        permanent_address: cob.permanent_address || null,
        relationship: cob.relationship || null,
      }),
    }).then((r) => r.json()),
  );

const [loanResults, colResults, cobResults] = await Promise.all([
  Promise.allSettled(loanPromises),
  Promise.allSettled(colPromises),
  Promise.allSettled(cobPromises),
]);
```

Verify endpoint `/api/customers/[id]/co-borrowers` POST đã có (đã scout: có).

### Phase 4 — Manual Verify

- [ ] Build pass: `npx tsc --noEmit`
- [ ] Upload DOCX cá nhân có đầy đủ thông tin → extract ra đủ 16 customer fields + co-borrowers
- [ ] Upload DOCX tối thiểu (chỉ có tên + CCCD) → modal hiển thị tất cả field rỗng để điền manual
- [ ] Trong review step, edit bất kỳ field nào → focus không mất, không re-render nhảy
- [ ] Xoá hết text trong 1 field → input vẫn còn, không biến mất
- [ ] Submit → customer tạo với đúng column (kiểm tra DB: `gender`, `cccd_old`, `email`, `bank_account` phải ở column riêng, không phải trong `data_json`)
- [ ] Submit → co-borrowers tạo thành công trong bảng `co_borrowers`
- [ ] Verify PII mask: trong list customer, `email`, `bank_account` phải bị mask (đã fix ở commit trước)

## Files Changed

| File | LOC delta | Ghi chú |
|------|-----------|---------|
| `src/services/customer-docx-extraction.service.ts` | +60 | +4 customer, +8 loan, new CoBorrower type, prompt mở rộng, merge logic |
| `src/components/customers/customer-docx-import-modal.tsx` | -200 + tách | Modularize xuống ~180 LOC, fix re-render, expand labels, add co-borrower section |
| `src/components/customers/customer-docx-import-modal-field-section.tsx` | +50 | NEW — FieldSection memo + field labels consts |
| `src/components/customers/customer-docx-import-modal-submit.ts` | +120 | NEW — extracted handleSubmit logic |
| `src/app/api/customers/route.ts` | +8 | Mở rộng createCustomerSchema |
| `src/services/customer.service.ts` | +6 | Forward field mới vào Prisma create |

## Out of Scope

- Corporate customer fields (main_business, charter_capital, legal rep) — defer
- Staff assignments (RO, appraiser, approver) — không có trong DOCX khách
- CIC product/rating — từ API CIC, không phải DOCX
- Credit history (credit-agribank, credit-other) — defer
- Related persons — defer
- Validation error boundary trên modal — defer

## Addendum (quyết định sau)

### Collaterals multi-type — NOW IN SCOPE

Mở rộng `ExtractedCollateral` để handle 4 loại TSBĐ. Common 4 fields + type-specific vào `properties_json`:

```ts
export type ExtractedCollateral = {
  // Common
  name: string;
  type: "qsd_dat" | "dong_san" | "tiet_kiem" | "tai_san_khac";
  total_value: number;
  obligation: number;

  // QSD đất
  certificate_serial: string;
  land_address: string;
  land_area: string;
  land_type_1: string;
  land_unit_price_1: number;
  land_type_2: string;
  land_unit_price_2: number;
  lot_number: string;
  sheet_number: string;

  // Động sản (xe, máy móc)
  registration_number: string;  // biển số
  brand: string;
  model: string;
  year: string;
  chassis_number: string;
  engine_number: string;

  // Tiết kiệm
  savings_book_number: string;
  deposit_bank_name: string;
  deposit_amount: number;
  deposit_date: string;

  // Tài sản khác
  description: string;
};
```

Prompt Gemini: thêm rule "Detect loại TSBĐ trước rồi fill type-specific fields; các field không liên quan để rỗng". Modal gom fields hiển thị theo `type` sau khi extract.

### Number format vi-VN

Helper `src/lib/format/vnd-number.ts`:
```ts
export function formatVndNumber(val: number | string): string {
  const n = typeof val === "string" ? Number(val.replace(/\D/g, "")) : val;
  if (!Number.isFinite(n) || n === 0) return "";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function parseVndNumber(str: string): number {
  const digits = str.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}
```

`FieldSection` nhận thêm prop `numberFields?: Set<string>`. Input của numberField: display `formatVndNumber(value)`, onChange `parseVndNumber(e.target.value)`.

Apply cho: `loan_amount`, `total_capital_need`, `equity_amount`, `expected_revenue`, `expected_profit`, `total_value`, `obligation`, `land_unit_price_1`, `land_unit_price_2`, `deposit_amount`.

### Modularize thêm

- `customer-docx-import-modal.tsx` — main state + step orchestration
- `customer-docx-import-modal-upload-step.tsx` — NEW, upload UI
- `customer-docx-import-modal-review-step.tsx` — NEW, review UI với all FieldSections
- `customer-docx-import-modal-field-section.tsx` — NEW, FieldSection + memo + labels
- `customer-docx-import-modal-submit.ts` — NEW, handleSubmit logic
- `src/lib/format/vnd-number.ts` — NEW, number formatter

## Rủi Ro

| Risk | Mitigation |
|------|-----------|
| Gemini không extract được co-borrowers nhất quán vì prompt Tiếng Việt không rõ | Test với 3-5 DOCX mẫu, tune prompt nếu accuracy thấp. Có thể cần few-shot example. |
| Bỏ filter làm UI hiển thị quá nhiều empty fields, rối mắt | Chấp nhận trade-off: user có thể điền được field thiếu là ưu tiên cao hơn |
| `createCustomer` service chưa handle field mới → silent ignore | Verify service code Phase 3.4 trước khi ship |
| Co-borrower POST endpoint signature khác với payload | Scout endpoint trước code Phase 3.5 |
| Email validation `.email()` làm blow up nếu Gemini trả chuỗi rác | Dùng `.optional().nullable().or(z.literal(""))` + pre-clean trong service |

## Câu Hỏi Còn Lại

1. Sau khi bỏ filter, UI có cần divider giữa "fields AI đã extract" vs "fields trống để điền" không? Hay cứ mixed cho đơn giản?
2. Format number fields (`total_capital_need`, `equity_amount`) — input plain text hay có formatter "1.234.567"? Hiện tại đang plain text, giữ nguyên?
3. Co-borrower extraction: nếu DOCX chỉ có 1 người vay (không có đồng vay), Gemini trả mảng rỗng. OK?
4. Modularize: có muốn tách tiếp `customer-docx-import-modal-review-step.tsx` (render review UI) hay giữ trong main file?
