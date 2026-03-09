# OnlyOffice Deployment cho người dùng cuối

**Ngày:** 2026-03-09 | **Trạng thái:** Tạm hoãn (dùng editor default trên Vercel)

## Hiện trạng

- OnlyOffice Document Server v8.2.2 đã tích hợp đầy đủ (Docker, JWT, API routes)
- Setup hiện tại chỉ hoạt động trên `localhost` (dev)
- Trên Vercel đang dùng trình chỉnh sửa default, hoạt động OK
- Khi nào nhu cầu phát sinh sẽ triển khai OnlyOffice cho production

## Vấn đề cần giải quyết (khi triển khai)

2 luồng network cần thông:
1. **Browser → OnlyOffice Server**: tải JS API + iframe editor
2. **OnlyOffice Server → Next.js Server**: download file + callback save

## Phương án A: Cùng server (Khuyến nghị - KISS)

Deploy Next.js + OnlyOffice Docker trên cùng 1 VPS, dùng reverse proxy:

```
User browser → Reverse Proxy (Nginx/Caddy)
                  /  → Next.js:3000
                  /oo/ → OnlyOffice:8080
```

### Checklist triển khai

| # | Việc | File/Config |
|---|------|-------------|
| 1 | Tạo `docker-compose.prod.yml` gộp Next.js + OnlyOffice + Nginx | root |
| 2 | Nginx config reverse proxy `/oo/` | `docker/nginx.conf` |
| 3 | Set env vars production | `.env.production` |
| 4 | SSL cert (Caddy auto hoặc certbot) | infra |
| 5 | Đảm bảo `APP_URL` dùng domain thật | `src/lib/onlyoffice/config.ts` |

### Env vars cần set

- `ONLYOFFICE_URL=https://yourdomain.com/oo`
- `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
- `ONLYOFFICE_JWT_SECRET=<strong-random-secret>`

## Phương án B: Tách server

OnlyOffice riêng 1 server (khi cần scale hoặc nhiều app dùng chung):
- OnlyOffice: `https://docs.yourdomain.com`
- Next.js: `https://app.yourdomain.com`
- Cần cross-origin CSP + CORS config
- Phức tạp hơn, chỉ cần khi có lý do rõ ràng

## Rủi ro & lưu ý

- **License**: Community Edition miễn phí, giới hạn 20 concurrent connections. Quá 20 → mua Developer/Enterprise (~$1-2K/năm)
- **RAM**: Container OnlyOffice cần tối thiểu 2GB. Server cần ≥4GB tổng
- **File storage**: Hiện dùng local filesystem. Single server OK, multi-instance cần shared storage
- **Security**: JWT ✓, SSRF protection ✓, CSP dynamic ✓
- **Document key**: MD5(path + mtime) OK cho single server, multi-instance cần DB-backed key

## Files liên quan

- `docker-compose.onlyoffice.yml` — Docker config
- `src/lib/onlyoffice/config.ts` — JWT + URLs
- `src/app/api/onlyoffice/config/route.ts` — Editor config API
- `src/app/api/onlyoffice/callback/route.ts` — Save callback
- `src/app/api/onlyoffice/download/route.ts` — File download
- `src/app/api/onlyoffice/health/route.ts` — Health check
- `src/components/onlyoffice-editor-modal.tsx` — Editor UI
- `next.config.ts` — CSP headers
