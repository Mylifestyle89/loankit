# Phase 3: Builder Logic

## Priority: HIGH | Status: pending

## Overview

Map 4 placeholder HĐTD thẻ mới + customer info bổ sung trong builder.

## Files to modify

### 1. `src/services/khcn-report-data-builder.ts`

Trong block build loan data (sau section HĐTD hiện tại), thêm:

```ts
// ── Thẻ tín dụng Lộc Việt ──
data["HĐTD.Hạn mức thẻ tín dụng"] = fmtN(loan.loanAmount);
data["HĐTD.HMTTD bằng chữ"] = numberToVietnameseWords(loan.loanAmount);
data["HĐTD.Số tài khoản"] = c.bank_account ?? "";
// Thời hạn hiệu lực: tính số tháng từ startDate → endDate
if (loan.startDate && loan.endDate) {
  const start = new Date(loan.startDate);
  const end = new Date(loan.endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  data["HĐTD.Thời hạn hiệu lực của thẻ"] = `${months} tháng`;
}
```

**Note:** Các placeholder này không ảnh hưởng template khác vì chỉ templates Lộc Việt dùng `[HĐTD.Hạn mức thẻ tín dụng]`. Placeholder không match = giữ nguyên trong DOCX.

### 2. Customer info bổ sung (cùng file)

Trong block build customer data, thêm:

```ts
// Parse data_json for extended fields
const dataJson = typeof c.data_json === "string" ? JSON.parse(c.data_json || "{}") : (c.data_json ?? {});
data["Nghề nghiệp"] = dataJson.occupation ?? "";
data["Quốc tịch"] = dataJson.nationality ?? "Việt Nam";
data["Loại giấy tờ tùy thân"] = dataJson.id_type ?? "CCCD";
data["Nơi công tác"] = dataJson.workplace ?? "";
data["Thu nhập bình quân/tháng"] = dataJson.monthly_income ? fmtN(Number(dataJson.monthly_income)) : "";
data["Ngành nghề kinh doanh"] = c.main_business ?? "";
```

### Data source mapping

| Placeholder | Source | Notes |
|---|---|---|
| `HĐTD.Hạn mức thẻ tín dụng` | `loan.loanAmount` | Reuse existing field |
| `HĐTD.HMTTD bằng chữ` | `numberToVietnameseWords(loan.loanAmount)` | Already imported |
| `HĐTD.Số tài khoản` | `customer.bank_account` | Already in builder line 75 as `Số tài khoản` → also set `HĐTD.` prefix |
| `HĐTD.Thời hạn hiệu lực của thẻ` | Computed: months between start/end | Auto |
| `Nghề nghiệp` | `data_json.occupation` | New |
| `Quốc tịch` | `data_json.nationality` | Default "Việt Nam" |
| `Loại giấy tờ tùy thân` | `data_json.id_type` | Default "CCCD" |
| `Nơi công tác` | `data_json.workplace` | New |
| `Thu nhập bình quân/tháng` | `data_json.monthly_income` | New |
| `Ngành nghề kinh doanh` | `customer.main_business` | Already in DB |

## Success Criteria

- Generate DOCX cho template Lộc Việt → all 4 HĐTD placeholders filled
- Customer fields (Nghề nghiệp, Quốc tịch) filled from data_json
- No regression on existing templates
