# Phase 3: BaseModal Responsive + Tap Targets

## Context
- File: `src/components/ui/BaseModal.tsx` (71 lines)
- File: `src/app/report/layout.tsx` — icon sizes `h-[17px] w-[17px]`
- Vấn đề 1: Modal lớn (max-w-4xl = 896px) tràn trên mobile
- Vấn đề 2: Icon 17px quá nhỏ cho tap target (khuyến nghị ≥ 44px vùng bấm)

## Phần A: BaseModal — Responsive max-width

### Thay đổi
Thêm `max-h` + responsive overflow cho modal content:

```tsx
// Trước
className={`relative w-full ${maxWidthClassName} rounded-2xl ...`}

// Sau — thêm max-h cho mobile scroll
className={`relative w-full ${maxWidthClassName} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl ...`}
```

BaseModal đã có `p-4` trên container → modal không chạm cạnh. Chỉ cần đảm bảo nội dung cuộn được khi quá dài.

### Các modal lớn — caller tự responsive
Các modal dùng `max-w-4xl` hoặc `max-w-3xl` cần sửa caller:

```tsx
// AiMappingModal.tsx — trước
maxWidthClassName="max-w-4xl"

// Sau
maxWidthClassName="max-w-[95vw] md:max-w-4xl"
```

**Danh sách modal cần sửa:**
- `AiMappingModal.tsx` — max-w-4xl → `max-w-[95vw] md:max-w-4xl`
- `FinancialAnalysisModal.tsx` — nếu dùng max-w-3xl+
- `OcrReviewModal.tsx` — nếu dùng max-w-3xl+
- Các modal khác dùng max-w-lg trở xuống → OK, không cần sửa

## Phần B: Icon Tap Targets

### Vấn đề
Sidebar icons: `h-[17px] w-[17px]` — icon nhỏ, vùng bấm cũng nhỏ.
Apple HIG khuyến nghị tap target ≥ 44px.

### Giải pháp
Không cần tăng icon size — chỉ cần đảm bảo **button/link wrapper** đủ lớn:

```tsx
// Hiện tại — link wrapper
className="... py-2 ..."  // = ~32px height → hơi nhỏ

// Sửa — thêm min-h cho mobile
className="... py-2 max-md:min-h-[44px] ..."
```

Hoặc đơn giản hơn, tăng padding trên mobile:
```tsx
className="... py-2 max-md:py-3 ..."  // py-3 = 12px × 2 + icon = ~41px
```

### Files cần sửa
- `src/app/report/layout.tsx` — nav links, bottom controls
  - Nav links: thêm `max-md:py-3`
  - Buttons (theme, language, logout): thêm `max-md:py-2.5`

## Kiểm tra
- [ ] BaseModal: Nội dung cuộn được trên mobile khi quá dài
- [ ] AiMappingModal: Không tràn ra ngoài viewport trên 375px
- [ ] Desktop: Tất cả modal giữ nguyên kích thước
- [ ] Sidebar links: Dễ nhấn bằng ngón tay trên mobile
- [ ] Desktop: Padding/spacing links không thay đổi

## Ghi chú
- Phase này ít rủi ro nhất — chỉ thêm CSS classes
- `max-md:` prefix = chỉ áp dụng dưới 768px
- Không sửa logic JS nào
