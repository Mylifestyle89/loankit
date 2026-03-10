# Phase 2: Mapping Sidebar (phải) — Responsive Width

## Context
- File: `src/app/report/mapping/components/MappingSidebar.tsx` (122 lines)
- Hiện tại: `animate={{ x: 0, width: 380 }}` — fixed 380px
- Vấn đề: iPhone 375px → sidebar tràn ra ngoài viewport

## Yêu cầu
- Mobile (<768px): Sidebar chiếm ~full width (`w-[calc(100vw-1rem)]` hoặc `w-full`)
- Desktop (≥768px): **Giữ nguyên** 380px

## Thay đổi cụ thể

### 1. Responsive width cho motion.div
```tsx
// Trước
animate={{ x: 0, width: 380 }}

// Sau — dùng CSS thay vì Framer Motion width
animate={{ x: 0 }}
className="... w-full max-w-[380px] md:w-[380px]"
```

Hoặc nếu muốn giữ Framer Motion animation:
```tsx
// Dùng hook đơn giản
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
animate={{ x: 0, width: isMobile ? window.innerWidth - 16 : 380 }}
```

**Khuyến nghị:** Dùng CSS (`w-full md:w-[380px]`) và bỏ `width` khỏi `animate` — đơn giản hơn, không cần JS check.

### 2. Cập nhật motion.div
```tsx
<motion.div
  initial={{ x: "100%" }}
  animate={{ x: 0 }}           // Bỏ width khỏi đây
  exit={{ x: "100%" }}
  transition={{ type: "spring", damping: 28, stiffness: 300 }}
  className="fixed inset-y-0 right-0 z-[101] flex h-screen w-full max-w-[380px] flex-col ..."
  //                                              ^^^^^^^^^^^^^^^^^^^^^^^^
  //                                              Thêm: w-full max-w-[380px]
>
```

## Kiểm tra
- [ ] Desktop: Sidebar vẫn 380px, animation slide-in giữ nguyên
- [ ] Mobile 375px: Sidebar chiếm gần full width, không tràn
- [ ] Mobile 390px: Tương tự
- [ ] Backdrop vẫn hoạt động (click ngoài → đóng)
- [ ] Escape vẫn đóng sidebar

## Ghi chú
- Thay đổi rất nhỏ: chỉ thêm `w-full max-w-[380px]` và bỏ `width: 380` khỏi animate
- Sidebar này đã có backdrop + close button → mobile-ready sẵn
