## Phase Implementation Report

### Executed Phase
- Phase: adhoc - KHCN amendment + prior contract + placeholder mapping
- Status: completed

### Files Modified
- `prisma/schema.prisma` — thêm 3 field vào model Loan: `prior_contract_number`, `prior_contract_date`, `prior_outstanding`
- `src/app/report/customers/[id]/components/collateral-config.ts` — thêm `AmendmentEntry` type, `EMPTY_AMENDMENT`, thêm `old_mortgage_date` vào DATE_KEYS
- `src/app/report/customers/[id]/components/collateral-form.tsx` — thêm `AmendmentRow` component, state `amendments`, handlers, UI section "Văn bản sửa đổi" trong cả qsd_dat và dong_san
- `src/services/khcn-report-data-builders.ts` — emit `_amendments` array → `Văn bản sửa đổi N`, `Ngày sửa đổi N`, `SĐ.Văn bản sửa đổi`, `SĐ.Ngày sửa đổi`; thêm `prior_contract_*` vào `buildLoanExtendedData`; emit `PA.HĐ cũ Số/Ngày/Dư nợ cũ`
- `src/services/khcn-report.service.ts` — map PA financials → `HĐTD.Doanh thu dự kiến`, `HĐTD.Chi phí dự kiến`, `HĐTD.Lợi nhuận dự kiến` sau khi call `buildLoanPlanExtendedData`
- `src/lib/report/khcn-placeholder-registry.ts` — thêm SĐ group: `SĐ.Tên HĐ thế chấp`, `SĐ.Văn bản sửa đổi`, `SĐ.Ngày sửa đổi`; HĐTD: 3 efficiency aliases + 2 prior contract; PA: `PA.HĐ cũ Số/Ngày/Dư nợ cũ`
- `src/app/api/loans/[id]/route.ts` — thêm 3 field vào Zod schema PATCH
- `src/services/loan.service.ts` — thêm type + passthrough cho 3 prior contract fields
- `src/components/invoice-tracking/loan-edit-subtabs.tsx` — thêm 3 UI fields "Số HĐ cũ", "Ngày HĐ cũ", "Dư nợ cũ" vào LoanEfficiencyTab + loanToExtFields + extFieldsToPayload

### Tasks Completed
- [x] Task 1: "Văn bản sửa đổi" repeater trong collateral form (lưu dạng `_amendments` JSON array trong properties_json)
- [x] Task 1: Builder emit `SĐ.Văn bản sửa đổi` / `SĐ.Ngày sửa đổi` + backward compat với single amendment_number
- [x] Task 1: Placeholder registry cập nhật SĐ group
- [x] Task 2: Schema Loan thêm prior_contract_* fields + `npx prisma db push` + `prisma generate`
- [x] Task 2: API/Service/UI loan edit modal thêm 3 field mới
- [x] Task 2: Builder emit `PA.HĐ cũ Số`, `PA.HĐ cũ Ngày`, `PA.Dư nợ cũ`, `HĐTD.Số HĐ cũ`, `HĐTD.Ngày HĐ cũ`
- [x] Task 3: Map `HĐTD.Doanh thu dự kiến` = PA.Tổng doanh thu dự kiến
- [x] Task 3: Map `HĐTD.Chi phí dự kiến` = PA.Tổng chi phí trực tiếp + PA.Lãi vay NH
- [x] Task 3: Map `HĐTD.Lợi nhuận dự kiến` = Doanh thu - Chi phí (hoặc từ PA.Lợi nhuận dự kiến)
- [x] Task 3: Emit `SĐ.Tên HĐ thế chấp` đã có trong extractLandFields; thêm vào registry

### Tests Status
- Type check: pass (no output = no errors)
- Next build: pass

### Notes
- DB migration dùng `prisma db push` (thay vì `migrate dev`) vì shadow DB lỗi gen_random_uuid trong seed SQL cũ
- `_amendments` được lưu trong `properties_json` (JSON column), không cần table mới — YAGNI
- HĐTD efficiency aliases chỉ set nếu chưa có giá trị (loan extended fields ưu tiên cao hơn)
