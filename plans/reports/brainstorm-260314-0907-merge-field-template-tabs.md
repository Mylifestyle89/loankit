# Brainstorm: Gộp hay Không Gộp Field Editor & Template Manager

## Problem Statement
User phải switch liên tục giữa 2 tab (Mapping & Template) khi làm việc. Pain point: mất context, field thiếu/không đồng bộ giữa field template và mẫu docx.

## Evaluated Approaches

### Option A: Gộp thành 1 trang (Split View / Wizard)
**Pros:**
- Seamless, thấy cả 2 cùng lúc (split view)
- Ít click hơn

**Cons:**
- Mapping page đã ~50+ files, 7 stores, 20+ modals → gộp thêm = quá tải
- Split view chật trên laptop nhỏ (user dùng màn hình hỗn hợp)
- Wizard mâu thuẫn với workflow nhảy qua lại
- Refactor effort rất lớn, risk cao
- Tăng bundle size và load time đáng kể

**Verdict: ❌ Không nên**

### Option B: Giữ 2 trang + Smart Sync ✅ (Recommended)
**Pros:**
- Giữ nguyên architecture, ít risk
- Giải quyết root cause (thiếu thông tin đồng bộ) thay vì symptom (phải switch)
- Effort vừa phải, incremental
- Mỗi trang giữ focus riêng, không bị overload

**Cons:**
- Vẫn phải switch tab (nhưng có context rõ hơn)

## Final Recommendation: Option B — Smart Sync

### Features cần implement:

1. **Field Coverage Indicator** (cả 2 trang)
   - Status bar: "12/15 fields có data" với progress bar
   - Hiển thị trên cả mapping page và template page

2. **Template Field Validation** (template page)
   - Scan placeholders `{field_name}` trong docx template
   - Highlight: 🟢 có data, 🔴 thiếu data, 🟡 data rỗng
   - List panel: danh sách field thiếu, click → navigate to mapping page

3. **Quick Navigation** (template → mapping)
   - Click field thiếu → redirect `/report/mapping?focus=field_name`
   - Mapping page đọc query param và auto-scroll/highlight field đó

4. **Reverse Sync** (mapping → template)
   - Trên mapping page, hiển thị badge "field này được dùng trong X template(s)"
   - Warning khi xóa field đang được template sử dụng

## Implementation Priority
1. Field Coverage Indicator (low effort, high impact)
2. Template Field Validation (medium effort, high impact)
3. Quick Navigation (low effort, medium impact)
4. Reverse Sync (medium effort, medium impact)

## Risk Assessment
- Low risk: không thay đổi architecture
- Incremental: ship từng feature độc lập
- Backward compatible: không break existing workflow

## Unresolved Questions
- Template placeholders format có chuẩn hóa chưa hay có nhiều format khác nhau?
- Có cần real-time sync hay chỉ cần sync khi navigate giữa 2 trang?
