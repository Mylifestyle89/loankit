# 📊 PLAN 1: XÂY DỰNG HỆ THỐNG PHÂN TÍCH TÀI CHÍNH

## 🎯 Mục Tiêu Chung
Xây dựng Field Catalog hoàn chỉnh cho báo cáo tài chính, cho phép AI phân tích tự động doanh số, lợi nhuận, các chỉ tiêu tài chính.

---

## 📋 PHASE 1: THIẾT KẾ FIELD CATALOG (1-2 ngày)

### 1.1. Tạo Master Field Catalog JSON
**File cần tạo:** `src/lib/report/financial-field-catalog.ts`

```typescript
// Ví dụ cấu trúc:
export const FINANCIAL_FIELD_CATALOG = [
  // === LỚP 1: CORE FIELDS (20 fields) ===
  {
    id: "customer_name",
    label_vi: "Tên khách hàng",
    group: "Thông tin chung",
    type: "text",
    tier: "core",
    required: true,
    importance_score: 10,
    analysis_prompt: "Xác định tên pháp nhân chính xác..."
  },
  // ... 19 core fields khác

  // === LỚP 2: DERIVED FIELDS (15 fields) ===
  {
    id: "current_ratio",
    label_vi: "Hệ số thanh toán hiện hành",
    formula: "total_current_assets / total_current_liabilities",
    type: "ratio",
    tier: "derived",
    analysis_prompt: "Đánh giá khả năng thanh khoản ngắn hạn...",
    benchmark: { min: 1.0, optimal: 1.5, max: 3.0 }
  },
  // ... 14 derived fields khác

  // === LỚP 3: CONTEXT FIELDS (43 fields) ===
  // ...
]
```

**Tasks cụ thể:**
- [ ] Định nghĩa 20 Core Fields từ 3 file tham khảo
- [ ] Viết công thức cho 15 Derived Fields
- [ ] Liệt kê 43 Context Fields optional

**Input từ 3 files:**
- `Phân tích tài chính.docx` → công thức, ý nghĩa từng chỉ tiêu
- `Báo cáo thẩm định.docx` → danh sách fields bắt buộc
- `Excel phân tích BCTC` → cách tổ chức dữ liệu, tên cột

---

### 1.2. Viết Analysis Prompts
**Cho mỗi Core Field, thêm:**
- `analysis_prompt`: Hướng dẫn AI phân tích field này
- `benchmark`: Giá trị tham chiếu (min/optimal/max)
- `interpretation_guide`: Cách giải thích kết quả

**Ví dụ:**
```typescript
{
  id: "roe",
  label_vi: "Return on Equity (ROE)",
  analysis_prompt: `Phân tích khả năng sinh lời của vốn chủ sở hữu:
    - Nếu < 5%: Hiệu quả thấp, cần cải thiện hoạt động
    - Nếu 5-15%: Bình thường, phù hợp ngành
    - Nếu > 15%: Rất tốt, công ty quản lý hiệu quả
    - So sánh với năm trước để xem xu hướng`,
  benchmark: { min: 5, optimal: 12, max: 25 },
  interpretation: "ROE cao hơn ngành = công ty sinh lời tốt hơn"
}
```

**Tasks:**
- [ ] Viết 20 analysis_prompts cho Core Fields
- [ ] Thêm benchmark cho tất cả chỉ tiêu tài chính
- [ ] Thêm interpretation_guide cho từng nhóm chỉ tiêu

---

## 📈 PHASE 2: CÔNG THỨC TÍNH TOÁN DERIVED FIELDS (1 ngày)

### 2.1. Xây dựng Engine Tính Toán

**File:** `src/lib/report/financial-calculator.ts`

```typescript
export function calculateDerivedField(
  fieldId: string,
  coreValues: Record<string, number>,
): number | null {
  switch (fieldId) {
    case "current_ratio":
      return coreValues.total_current_assets / coreValues.total_current_liabilities;
    case "roe":
      return (coreValues.net_profit / coreValues.total_equity) * 100;
    // ...
  }
}
```

**Tasks:**
- [ ] Định nghĩa đầu vào (coreValues mapping)
- [ ] Implement 15 công thức tính toán
- [ ] Handle edge cases (chia 0, giá trị null)
- [ ] Unit test cho mỗi công thức

---

## 🤖 PHASE 3: TỰ ĐỘNG POPULATE FIELD CATALOG (1 ngày)

### 3.1. API Endpoint: GET /api/report/financial-catalog
```typescript
export async function GET() {
  return NextResponse.json({
    ok: true,
    field_catalog: FINANCIAL_FIELD_CATALOG,
    core_fields: 20,
    derived_fields: 15,
    context_fields: 43
  });
}
```

### 3.2. Hook: useFinancialCatalog()
```typescript
export function useFinancialCatalog() {
  const [catalog, setCatalog] = useState<FieldCatalogItem[]>([]);

  useEffect(() => {
    const loadCatalog = async () => {
      const res = await fetch("/api/report/financial-catalog");
      const data = await res.json();
      setCatalog(data.field_catalog);
    };
    loadCatalog();
  }, []);

  return { catalog };
}
```

**Tasks:**
- [ ] Tạo API endpoint
- [ ] Tạo hook để load catalog
- [ ] Integrate vào FinancialAnalysisModal

---

## 🧪 PHASE 4: KIỂM THỬ & VALIDATION (1 ngày)

### 4.1. Test Data
Dùng file Excel phân tích BCTC làm test data:
- [ ] Trích xuất giá trị core fields từ Excel
- [ ] Tính toán derived fields
- [ ] So sánh với giá trị trong Excel (phải match)

### 4.2. Validation Rules
```typescript
const VALIDATION_RULES = {
  current_ratio: { min: 0, max: 100 },
  roe: { min: -100, max: 100 },
  debt_to_equity: { min: 0, max: 50 }
};
```

**Tasks:**
- [ ] Viết validation cho tất cả chỉ tiêu
- [ ] Test edge cases (negative values, zero division)
- [ ] Document lỗi phổ biến

---

## 🎁 DELIVERABLES

### File 1: `src/lib/report/financial-field-catalog.ts`
- 78 fields (20 core + 15 derived + 43 context)
- Mỗi field có analysis_prompt
- Mỗi chỉ tiêu có benchmark

### File 2: `src/lib/report/financial-calculator.ts`
- Engine tính 15 derived fields
- Với unit tests

### File 3: `src/app/api/report/financial-catalog/route.ts`
- GET endpoint return field catalog

### File 4: `src/app/report/mapping/hooks/useFinancialCatalog.ts`
- Hook to load and manage catalog

### Updated: `src/app/report/mapping/components/Modals/FinancialAnalysisModal.tsx`
- Integrate field catalog
- Enable AI analysis via analysis_prompts

---

## ✅ SUCCESS CRITERIA

- [ ] Tất cả 78 fields được định nghĩa
- [ ] Tất cả core fields có analysis_prompt
- [ ] Tất cả derived fields có công thức
- [ ] Test data match 100% với Excel
- [ ] FinancialAnalysisModal hiển thị 15+ chỉ tiêu
- [ ] AI có thể phân tích mỗi chỉ tiêu

---

## 📝 NOTES

- Tham khảo 3 files: Phân tích tài chính.docx, Báo cáo thẩm định.docx, Excel
- Ưu tiên Core Fields trước (20 fields là nền tảng)
- Sau đó mới làm Derived Fields
- Context Fields có thể để sau nếu hết thời gian
