# Phase 1: Main Sidebar — Mobile Hamburger Menu

## Context
- File: `src/app/report/layout.tsx` (212 lines)
- Sidebar hiện tại: hover-based expand (48px → 240px), `onMouseEnter/Leave`
- Vấn đề: Touch screen không có hover → sidebar không mở được trên mobile

## Yêu cầu
- Mobile (<768px): Ẩn sidebar, hiện hamburger button (☰) ở góc trái trên
- Nhấn hamburger → sidebar mở dạng overlay full-width, có backdrop
- Nhấn bên ngoài hoặc Escape → đóng
- Desktop (≥768px): **Giữ nguyên** hover-based behavior hiện tại

## Thay đổi cụ thể

### 1. Thêm state mobile menu
```tsx
const [mobileOpen, setMobileOpen] = useState(false);
```

### 2. Thêm hamburger button (chỉ hiện trên mobile)
```tsx
{/* Mobile hamburger — chỉ hiện dưới md */}
<button
  className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 shadow-md backdrop-blur dark:bg-[#1a1a1a]/90 md:hidden"
  onClick={() => setMobileOpen(true)}
>
  <Menu className="h-5 w-5" />
</button>
```

### 3. Sửa sidebar: thêm mobile overlay mode
```tsx
<motion.aside
  onMouseEnter={() => setHovered(true)}   // Desktop: giữ nguyên
  onMouseLeave={() => setHovered(false)}  // Desktop: giữ nguyên
  animate={{
    width: mobileOpen ? SIDEBAR_EXPANDED : (hovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED)
  }}
  className={`
    fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden ...
    max-md:${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    max-md:w-[240px] max-md:z-50
  `}
>
```

Hoặc đơn giản hơn — conditional render:
- Mobile: sidebar ẩn hoàn toàn, mở = overlay 240px + backdrop
- Desktop: giữ nguyên motion.aside hiện tại

### 4. Backdrop cho mobile
```tsx
{mobileOpen && (
  <div
    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
    onClick={() => setMobileOpen(false)}
  />
)}
```

### 5. Main content: bỏ marginLeft trên mobile
```tsx
<main
  className="min-h-screen max-md:ml-0"
  style={{ marginLeft: SIDEBAR_COLLAPSED }}  // Desktop giữ nguyên
>
```
→ Hoặc dùng Tailwind thay inline style:
```tsx
className="min-h-screen ml-0 md:ml-[48px]"
```

### 6. Close sidebar khi navigate (mobile)
```tsx
useEffect(() => {
  setMobileOpen(false);
}, [pathname]);
```

## Kiểm tra
- [ ] Desktop: Sidebar hover expand vẫn hoạt động như cũ
- [ ] Mobile: Hamburger hiện, nhấn → sidebar overlay
- [ ] Mobile: Nhấn link → navigate + đóng sidebar
- [ ] Mobile: Nhấn backdrop / Escape → đóng sidebar
- [ ] Content không bị margin-left trên mobile

## Ghi chú
- Import thêm `Menu` từ lucide-react
- Cân nhắc `useMediaQuery` hook nếu cần logic JS, hoặc chỉ dùng CSS classes `md:hidden` / `max-md:hidden`
