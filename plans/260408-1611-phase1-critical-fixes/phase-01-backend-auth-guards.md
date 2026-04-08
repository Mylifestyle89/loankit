# Phase 01 — Backend Auth Guards (C2)

## Context Links
- `plans/reports/code-reviewer-260408-1556-backend.md` § C2
- `src/lib/auth-guard.ts` — helpers đã có sẵn (`requireSession`, `requireEditorOrAdmin`, `requireAdmin`, `handleAuthError`, `AuthError`)
- `src/lib/api/with-error-handling.ts` — đã handle `AuthError` → 401/403 tự động

## Overview
- Priority: P1
- Status: pending
- Effort: ~1h
Thêm explicit auth check trong handler các route nhạy cảm. Hiện proxy chỉ check cookie presence; route handler không gọi `requireSession/requireEditorOrAdmin/requireAdmin`. Single-user nên risk thấp nhưng vẫn fix.

## Key Insights
- `withErrorHandling` (lib/api/with-error-handling.ts) **đã** map `AuthError` → status code đúng. Route nào dùng wrapper này chỉ cần `await requireXxx()` ở đầu handler — không cần try/catch riêng.
- Route nào còn dùng try/catch raw + `toHttpError` thì gọi thêm `handleAuthError(error)` trong catch (pattern đã có ở `customers/route.ts`).
- **KHÔNG** tạo `withAuth(role)` wrapper mới. YAGNI: 1 dòng `await requireXxx()` ở đầu handler đơn giản hơn HOC. Có thể xét lại sau Phase 2 nếu lặp >20 chỗ.
- Báo cáo nói `GET /api/customers/[id]` thiếu auth — thực tế file đã có `requireEditorOrAdmin()` nhưng **chỉ chạy khi có `?reveal=`**. GET cơ bản vẫn không check session → vẫn thiếu, cần bổ sung guard ngoài nhánh reveal.
- `POST /api/report/snapshots/restore` đã dùng `withErrorHandling` + `withValidatedBody` nhưng KHÔNG có auth check bên trong.
- `GET /api/report/file/token` issue HMAC token cho download DOCX — cực nhạy cảm vì combine với secret fallback (I2). Bắt buộc `requireSession` tối thiểu.

## Requirements
- Mỗi route dưới đây phải gọi đúng helper trước khi chạy business logic.
- Không phá hỏng response shape hiện tại (`{ok, ...}` hoặc `{token}`).
- Lint + build sạch.

## Auth Level Mapping
| Route | Method | Helper |
|---|---|---|
| `src/app/api/customers/route.ts` | GET | `requireSession` |
| `src/app/api/customers/[id]/route.ts` | GET | `requireSession` (sửa nhánh non-reveal) |
| `src/app/api/loans/[id]/route.ts` | GET | `requireSession` |
| `src/app/api/notifications/route.ts` | GET | `requireSession` |
| `src/app/api/report/template/save-docx/route.ts` | PUT | `requireEditorOrAdmin` |
| `src/app/api/report/build/route.ts` | POST | `requireEditorOrAdmin` |
| `src/app/api/report/snapshots/restore/route.ts` | POST | `requireEditorOrAdmin` |
| `src/app/api/report/backups/restore/route.ts` | GET | `requireEditorOrAdmin` |
| `src/app/api/report/file/token/route.ts` | GET | `requireSession` |

Lý do: GETs đọc-only → session đủ. Mọi mutating / build / restore / overwrite template / issue token → editor+.

## Related Code Files
**Modify:**
- `src/app/api/customers/route.ts`
- `src/app/api/customers/[id]/route.ts`
- `src/app/api/loans/[id]/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/report/template/save-docx/route.ts`
- `src/app/api/report/build/route.ts`
- `src/app/api/report/snapshots/restore/route.ts`
- `src/app/api/report/backups/restore/route.ts`
- `src/app/api/report/file/token/route.ts`

**Read-only (reference):**
- `src/lib/auth-guard.ts`
- `src/lib/api/with-error-handling.ts`

**Create:** none

**Delete:** none

## Implementation Steps
1. Đọc lại từng route để xác định pattern đang dùng (raw try/catch vs `withErrorHandling`).
2. Với route raw try/catch (`customers/route.ts` GET, `customers/[id]/route.ts` GET, `loans/[id]/route.ts` GET, `notifications/route.ts` GET, `save-docx/route.ts` PUT, `build/route.ts` POST, `backups/restore/route.ts` GET, `file/token/route.ts` GET):
   - Import `requireSession` hoặc `requireEditorOrAdmin` + `handleAuthError` từ `@/lib/auth-guard` nếu chưa có.
   - Thêm `await requireXxx();` ngay đầu try block, trước khi parse params/body.
   - Trong catch, thêm `const authResponse = handleAuthError(error); if (authResponse) return authResponse;` trước khi fallback `toHttpError` (theo pattern `customers/route.ts` POST đã có).
3. Với route dùng `withErrorHandling` (`snapshots/restore/route.ts`):
   - Import `requireEditorOrAdmin`.
   - Thêm `await requireEditorOrAdmin();` ở đầu callback bên trong `withValidatedBody`. `withErrorHandling` sẽ tự catch `AuthError`.
4. `customers/[id]/route.ts` GET: nhánh non-reveal hiện không guard. Đặt `await requireSession();` ngay đầu try (trước if `revealParam`), sau đó nhánh reveal vẫn giữ `await requireEditorOrAdmin()` riêng để escalate quyền.
5. `file/token/route.ts` GET hiện không có try/catch — wrap nhẹ: thêm `try { await requireSession(); ... } catch (e) { const r = handleAuthError(e); if (r) return r; throw e; }` HOẶC convert sang `withErrorHandling` (sạch hơn). Chọn convert sang `withErrorHandling` để đồng nhất.
6. Chạy `npx tsc --noEmit` (hoặc `npm run lint`) để verify type.
7. `npm run build` để verify Next compile.
8. Manual smoke: gọi 1 route trong số trên không session → expect 401.

## Todo List
- [ ] Đọc lại 9 route files
- [ ] Sửa `customers/route.ts` (GET requireSession)
- [ ] Sửa `customers/[id]/route.ts` (GET requireSession non-reveal branch)
- [ ] Sửa `loans/[id]/route.ts` (GET requireSession)
- [ ] Sửa `notifications/route.ts` (GET requireSession)
- [ ] Sửa `save-docx/route.ts` (PUT requireEditorOrAdmin)
- [ ] Sửa `build/route.ts` (POST requireEditorOrAdmin)
- [ ] Sửa `snapshots/restore/route.ts` (POST requireEditorOrAdmin trong callback)
- [ ] Sửa `backups/restore/route.ts` (GET requireEditorOrAdmin)
- [ ] Sửa `file/token/route.ts` (convert sang withErrorHandling + requireSession)
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Smoke test 1 route 401

## Success Criteria
- Cả 9 route trả 401 (không session) hoặc 403 (sai role) thay vì 200.
- Routes có session hợp lệ vẫn hoạt động bình thường.
- Build + lint pass.

## Risk Assessment
- **Risk:** Frontend caller chưa handle 401 → user thấy lỗi lạ. Mitigation: app single-user, anh Quân login sẵn → ít gặp; nếu xảy ra thì caller cũ vẫn nhận `{ok:false,error}` parse được.
- **Risk:** `withErrorHandling` convert `file/token/route.ts` đổi response shape (hiện trả `{token}` không có `ok`). Mitigation: Giữ nguyên `NextResponse.json({token})` bên trong handler — wrapper không can thiệp success path.
- **Risk:** `requireEditorOrAdmin` trong cron path. Build/restore có thể được trigger qua cron route khác — kiểm tra không trigger trực tiếp 9 route trên từ scheduler. Nếu có, escalate lên user.

## Security Considerations
- Defense-in-depth: proxy.ts vẫn check cookie presence ở edge; route handler check signature qua `auth.api.getSession`.
- Role escalation: editor đủ cho mutating template/build (anh Quân tự dùng), admin chỉ cần cho destructive ops (đã có sẵn ở DELETE).
- Không log session content trong error path.

## Next Steps
- Phase 2 (out-of-scope): consolidate dual `withErrorHandling`, require `FILE_ACCESS_SECRET` at boot, bind token to session.

## Unresolved Questions
- `file/token/route.ts` có cần thêm user-id binding vào HMAC payload (I2) không? — defer Phase 2.
- Có cron job nào gọi `/api/report/build` không? Nếu có, dùng `CRON_SECRET` header check thay vì session.
