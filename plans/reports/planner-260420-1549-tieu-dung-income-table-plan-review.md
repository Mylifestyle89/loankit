---
type: planner-review
date: 2026-04-20 15:49
topic: Review plan "KHCN Tieu dung - Nguon tra no dang bang"
plan: plans/260420-1525-khcn-tieu-dung-nong-nghiep-template
---

# Review — KHCN Tieu Dung Nguon Tra No Dang Bang

## Verdict
**Yes, ready for Phase 1**, voi 3 fix truoc khi code (xem 🔴). Scope hop ly, reuse `calcRepaymentSchedule` dung, gate rule don gian. Khong vi pham contract.

## Verified vs actual code

| Assumption plan | Thuc te | Match |
|---|---|---|
| `LoanPlanFinancialsExtended` extend tu Financials voi `income_source_type`, `earner*`, `term_months`, `repayment_frequency` | Confirmed (`loan-plan-types.ts:90-122`) | ✅ |
| `EXTENDED_FINANCIAL_KEYS` o `loan-plan.service.ts:51-64` | Confirmed, da co `income_source_type` | ✅ |
| `calcRepaymentSchedule` ho tro freq 1/3/6/12 voi `annualIncome` | Confirmed (`loan-plan-calculator.ts:129-173`) | ✅ |
| `KhcnDocTemplate` co field `methods[]`, registry export `KHCN_TEMPLATES` + `getTemplatesForMethod` | Confirmed (`khcn-template-registry.ts:12-101`) | ✅ |
| Builder tieu dung hardcode luong, emit `HĐTD.Tổng thu nhập từ SXKD = 0` | Confirmed (`khcn-builder-loan-plan-tieu-dung.ts:156-166`) | ✅ |
| PA_TRANO loop da co trong trung_dai builder (line 262+) va placeholder registry | Confirmed | ✅ |
| File .docx tieu dung hien tai: 1 file `2268.02A BCDXCV tieu dung co TSBD.docx` | Confirmed | ✅ |

## Contract check (loan-and-plan.contract.md)

- **§5.3 sync 4 places** — plan follow dung (types/zod/whitelist/editor). OK
- **§5.9 DB constraints relaxed, integrity o service layer** — plan goi service layer, OK
- **§5.6 method mismatch enforcement** — plan khong touch; OK
- **§10 discriminated union deferred** — plan them nhieu optional fields, van manageable, khong trigger refactor

No contract violation.

## 🔴 Blockers (must fix truoc Phase 1)

1. **Confuse 2 concept "template"**:
   - `new/page.tsx:15-35` picker la **LoanPlanTemplate (DB records)** fetch tu `/api/loan-plans/templates` — KHAC `KhcnDocTemplate` (registry file .docx).
   - Phase 5 Step 4 viet "UI picker new loan plan page de filter dung" — **sai target**. `KhcnDocTemplate` filter thuc ra ap dung khi **xuat DOCX** (cho nay la `khcn-report.service.ts` / `/api/report/templates/khcn`), KHONG phai o form tao plan.
   - Fix: tach ro — plan tao voi income_source state o **form tao plan** (DB), filter .docx template o **export step** (registry). Dot them `incomeSources` vao `KhcnDocTemplate` OK, nhung Step 4 can redirect den route `/report/khcn/templates` hoac export dialog.

2. **`ON_TRANO` placeholder shape mismatch**: Plan Phase 4 emit `PA_TRANO` row co cot `"Số tiền vay"`, NHUNG registry hien tai (line 250-252) + trung_dai builder (line 277-284) dung `"Dư nợ"`. Fix: doi plan sang `"Dư nợ"` de reuse placeholder + template loop existing. (Ten cot trong file goc Ho Phuoc Da la "Số tiền vay" — van render dung vi user edit template rieng, nhung doi lech naming convention khap code.) → Recommend: giu naming registry (`Dư nợ`), rename header trong file .docx moi. Hoac mo rong registry voi alias `PA_TRANO.Số tiền vay = PA_TRANO.Dư nợ`.

3. **Editor `Financials` type (`loan-plan-editor-types.ts`) la duplicate cua `LoanPlanFinancialsExtended`** — plan phase 2 add fields 2 noi (types.ts + editor-types.ts) — OK nhung de quen 1 noi. Viet checklist phase 2: update ca 2 type file. Contract §5.3 + feedback memory da warn, plan phase 2 co list 4 noi nhung order rat de miss.

## 🟡 Concerns / need user clarify

1. **Migration data cu**: khong co data tieu dung nguon agriculture/business trong DB (chi co salary). ok — skip migration.
2. **Auto-compute totals React loop risk**: plan phase 3 dung `useMemo` cho auto-sum — OK khong co loop neu deps = items array reference. Nhung neu `onChange` boi truong `agriculture_total_cost` -> parent re-render -> child re-compute -> emit `onChange` -> infinite. **Mitigation**: chi emit onChange khi items change, khong emit lai total auto-computed. Tach `displayTotal` (local) vs `persistedTotal` (state).
3. **`isGroupHeader` + calculator**: plan phase 3 auto-sum `amount` qua items, NEU group header co `amount > 0` se cong nham (file mau Ho Phuoc Da co dong "I.TONG CHI PHI" hien total). Fix: sum filter `!isGroupHeader`.
4. **Rental scope**: plan khai bao `INCOME_SOURCE_OPTIONS` da co `rental` (line 33). Neu user chon rental, UI se fallback ve `salary` form (vi conditional 3-way). Plan cần explicit decision: **disable** rental option khi chua support hoac **treat as salary** (narrative + flat fields). Recommend hide rental tam thoi trong dropdown.
5. **`repayment_narrative` free text**: plan co, nhung template hien tai co placeholder `PA.Câu thu nhập` generate auto tu earner. Agriculture dung narrative moi `HĐTD.Mô tả nguồn trả nợ` -> 2 placeholder song song, khong collision. OK.
6. **Multi-earner trong agriculture/business**: 1 ho so tieu dung co the co vo chong cung canh tac/kinh doanh (ho gia dinh). Plan khong mention — cho xu ly qua `repayment_narrative` free-text. Acceptable nhung note.

## 💡 Optimization (giu YAGNI/KISS)

1. **BusinessRevenueRow vs AgricultureItem nen dung 1 type chung** — sau khi nghien xem file mau B co cot "Gia tri nhap" + "Doanh thu" — tuong duong `unitPrice × quantity` va `amount` voi **2 muc khac nhau**. Van nen tach 2 types (plan dung) vi semantic column khac. KISS pass. Skip generalization.
2. **Bo 3 field "auto-compute totals"** (`agriculture_total_cost`, `agriculture_total_revenue`, `agriculture_profit`) — chung co the derive tu `items[]`. Luu thua gay risk stale. **Recommend**: chi persist `items[]` + `agriculture_living_expenses_annual`; compute total ngay trong builder. Giam 3 key khoi whitelist + zod. 
3. **Tuong tu business**: `business_total_import`, `business_total_revenue`, `business_gross_profit_annual` → derive tu `rows[]`. Chi luu `rows[]`, `business_other_costs_annual`, `business_living_expenses_monthly`. **Giam 3 field.**
4. **Phase 4 `buildSalaryIncomeData()` extract** — neu inline hien tai da rat rieng va work, skip extract (rui ro regression). Plan phase 4 step 1 noi "tu logic builder hien tai" → OK neu chi copy signature.
5. **3 file DOCX** — Option C (3 files) hop ly cho layout khac biet, nhung note: ten file registry phai unique (khong conflict path). OK trong plan.
6. **PA_TRANO extract helper** (phase 1 step 1) — neu trung_dai builder dung inline va chi ~20 dong code, extract co rui ro regression. **Recommend YAGNI**: copy logic vao agriculture helper, skip refactor trung_dai lan nay. Da co comment trong plan phase 4 step 3 nhung chua dut khoat — lam ro: skip extract.

## Overall

Scope chat, effort 9h realistic. Plan rat chi tiet voi file mau thuc (Ho Phuoc Da, Le Huu Duong) lam TC data. 3 fix blocker la surface-level (doc clarification, naming alignment), khong phai architectural re-think. Sau khi fix 🔴, bat dau Phase 1 duoc.

## Unresolved Questions

1. Plan Phase 5 step 4 "UI new loan plan page filter" — dinh nham target. Nen filter o trang nao? Ngay tao plan (so khop income source → template DB), hay dialog export (registry .docx)?
2. `PA_TRANO.Số tiền vay` vs `PA_TRANO.Dư nợ` — rename column header trong 2 file .docx moi (khop registry) hay mo rong registry alias?
3. Rental co nen remove khoi dropdown tam thoi (phase 1) de user khong chon nham?
4. `agriculture_total_*` / `business_total_*` — giu (user override) hay bo (auto compute tu items)? Recommend bo de DRY.
5. Ai chiu trach nhiem edit 2 file .docx moi (agriculture + business)? Dev test nay hay user cung cap sau?
