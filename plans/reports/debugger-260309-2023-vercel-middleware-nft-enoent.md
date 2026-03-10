# Debug Report: ENOENT middleware.js.nft.json on Vercel

**Date:** 2026-03-09
**Error:** `ENOENT: no such file or directory, open '/vercel/path0/.next/server/middleware.js.nft.json'`
**Stack:** Next.js 16.1.6 + Prisma 7.x + Vercel

---

## Executive Summary

**Root cause:** Next.js 16 đã **deprecated `middleware.ts`** và thay bằng `proxy.ts`. Vercel's build adapter cho Next.js 16 tìm kiếm `proxy.js.nft.json` nhưng vẫn cần resolve `middleware.js.nft.json` — khi file này không tồn tại (hoặc build bị confused), ENOENT xảy ra.

**Nguyên nhân phụ (aggravating factor):** `turbopack.root: process.cwd()` trong `next.config.ts` khiến Turbopack file tracing bao gồm toàn bộ thư mục gốc, làm NFT trace bị lỗi hoặc chứa file không mong muốn.

**`prisma.config.ts`:** Không phải nguyên nhân trực tiếp, nhưng `import "dotenv/config"` trong file này có thể bị traced vào middleware bundle nếu Turbopack mở rộng root quá rộng.

**Fix đơn giản nhất:** Đổi tên `middleware.ts` → `proxy.ts` (theo chuẩn Next.js 16).

---

## Phân tích

### 1. Next.js 16: middleware.ts bị deprecated

Từ Next.js 16 changelog chính thức:
> "`middleware.ts` filename — Rename to `proxy.ts` to clarify network boundary and routing focus"
> "The `middleware.ts` file is still available for Edge runtime use cases, but it is **deprecated** and will be removed in a future version."

Vercel's Next.js 16 build adapter đã được cập nhật để kỳ vọng `proxy.js.nft.json`, không phải `middleware.js.nft.json`. Khi project vẫn dùng `middleware.ts`, Turbopack build có thể không generate đúng NFT file hoặc Vercel không tìm thấy nó ở đúng path.

### 2. `turbopack.root: process.cwd()` gây file tracing vấn đề

`next.config.ts` hiện có:
```ts
turbopack: {
  root: process.cwd(),
},
```

Theo GitHub issue #84960 (vercel/next.js), `turbopack.root` mở rộng ra toàn bộ working directory khiến NFT trace include cả `prisma.config.ts`, `dotenv`, và nhiều file không liên quan. Điều này:
- Làm tăng kích thước serverless function
- Có thể khiến middleware NFT trace bị lỗi khi Vercel deploy

`process.cwd()` ở production trên Vercel trỏ đến `/vercel/path0/` — nếu Turbopack root không được set đúng, nó có thể trace sai path.

### 3. outputFileTracingExcludes dùng key sai

File hiện tại:
```ts
outputFileTracingExcludes: {
  "/middleware": ["./node_modules/better-sqlite3/**", ...],
},
```

Key `"/middleware"` không đúng với Next.js 16 khi file source là `middleware.ts`. Key cần match với route pattern, và với Turbopack thì behavior có thể khác webpack.

### 4. prisma.config.ts — aggravating factor

`prisma.config.ts` có `import "dotenv/config"` — đây là file TypeScript ở root project. Nếu Turbopack trace root quá rộng, file này (cùng `dotenv` package) có thể bị bundle vào middleware trace, gây ra dependency chain không cần thiết. Tuy nhiên đây không phải nguyên nhân chính của ENOENT.

---

## Recommended Fix (theo thứ tự ưu tiên)

### Fix 1 (BẮT BUỘC): Đổi tên middleware.ts → proxy.ts

```bash
# Rename file
mv middleware.ts proxy.ts
```

Cập nhật nội dung `proxy.ts`: đổi export name từ `middleware` → `proxy`:
```ts
// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// ... (logic giữ nguyên)

export function proxy(request: NextRequest) {  // <-- đổi tên
  // ... logic không đổi
}

export const config = {
  matcher: [ /* giữ nguyên */ ],
};
```

**Lý do:** Đây là breaking change của Next.js 16. Vercel's adapter cho Next.js 16 expect `proxy.js.nft.json`.

### Fix 2 (QUAN TRỌNG): Xóa `turbopack.root` trong next.config.ts

```ts
// Xóa block này:
turbopack: {
  root: process.cwd(),
},
```

`turbopack.root` chỉ cần thiết trong monorepo để resolve files ngoài project root. Project đơn không cần, và nó gây ra file tracing bao gồm cả repo root.

### Fix 3 (TÙY CHỌN): Cập nhật outputFileTracingExcludes

Sau khi đổi sang proxy.ts, cập nhật key:
```ts
outputFileTracingExcludes: {
  "/proxy": [
    "./node_modules/better-sqlite3/**",
    "./node_modules/@prisma/**",
    "./prisma/**",
  ],
},
```

---

## Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `middleware.ts` | Đổi tên → `proxy.ts`, đổi export name `middleware` → `proxy` |
| `next.config.ts` | Xóa `turbopack: { root: process.cwd() }` block |
| `next.config.ts` | Cập nhật key trong `outputFileTracingExcludes`: `"/middleware"` → `"/proxy"` |

**KHÔNG cần thay đổi:**
- `prisma.config.ts` — không phải nguyên nhân chính
- `prisma/schema.prisma` — không liên quan
- `serverExternalPackages` — config đúng

---

## Unresolved Questions

1. Next.js 16.1.6 có phải là stable release không? Blog post nói Next.js 16 ra tháng 10/2025 — cần verify version 16.1.6 có thực sự stable trên Vercel adapter chưa.
2. `better-auth/cookies` có hoạt động đúng trong `proxy.ts` (Node.js runtime) không, hay vẫn cần Edge runtime?
3. Vercel có auto-detect Next.js 16 và dùng adapter mới không, hay cần config thêm trong `vercel.json`?

---

## Sources

- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) — proxy.ts thay thế middleware.ts
- [Upgrading to Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Turbopack file tracing includes repo root - Issue #84960](https://github.com/vercel/next.js/issues/84960)
- [Rename middleware to proxy discussion](https://github.com/vercel/next.js/discussions/84842)
- [Prisma v7 + Next.js 16 + Turbopack fix](https://www.buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix)
