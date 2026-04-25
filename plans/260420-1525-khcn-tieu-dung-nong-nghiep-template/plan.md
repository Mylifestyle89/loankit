---
title: "KHCN Tieu dung - Nguon tra no dang bang (Nong nghiep + Kinh doanh)"
description: "Them 2 nguon tra no dang bang (agriculture, business) cho ho so tieu dung, reuse infrastructure cost/revenue/PA_TRANO tu trung_dai"
status: pending
priority: P1
effort: 9h
branch: main
tags: [khcn, tieu-dung, loan-plan, agriculture, business, table-based-income]
created: 2026-04-20
updated: 2026-04-20
---

# KHCN Tieu dung - Nguon tra no dang bang

## Overview

Ho so vay tieu dung hien chi support `income_source = salary` (2 earner luong). Can mo rong cho 2 nhom nguon co chung dac diem **phai the hien bang chi phi/doanh thu + bang tra no**:

1. **Agriculture** (`income_source_type = "agriculture"`) — san xuat nong nghiep (file mau: Ho Phuoc Da_2026-01-10)
2. **Business** (`income_source_type = "business"`) — kinh doanh co giay phep (file mau: Le Huu Duong_2026-03-13)

**Key difference salary:** Khong can bang; chi can form earner + luong thang.
**Key difference agriculture vs business:** Cot bang khac nhau (xem bang so sanh duoi).

## Cau truc bang 2 nguon (tham chieu mau thuc)

| Feature | Agriculture (file A) | Business (file B) |
|---------|---------------------|-------------------|
| Cot bang | STT / Khoan muc / DVT / Don gia / So luong / Thanh tien | STT / Nhom hang / So luong / Gia nhap / Doanh thu |
| Hierarchy | I.TONG CHI PHI > sub-items, II.THU NHAP, III.LAI/LO | I.Nhom A > sub-items, II, III..., TONG CONG |
| Doanh thu | San luong x don gia | Doanh thu truc tiep tung nhom |
| Khac thu nhap | = revenue - cost | = doanh thu - gia nhap - chi phi khac |
| Tra goc | Theo nam (12 thang/ky) | Hang thang (hoac tuy chon) |
| Bang tra no | Nam/So tien vay/Goc/Lai/TN tra no/TN con lai | Khong bat buoc (gop lai thanh narrative) |

## Design Decisions (Confirmed)

1. **Reuse `LoanPlanFinancialsExtended`** — khong migration Prisma, luu vao `financials_json`
2. **Hierarchy: flag `isGroupHeader: boolean`** (Q1 - Option A) — flat array, KISS. File mau chi co 2 tang, flag du dung.
3. **2 table shapes rieng** — khong generalize (cot khac). Dispatch theo `income_source_type`:
   - `agriculture` -> loop `PA_CHIPHI_AGRI` (6 cot)
   - `business` -> loop `PA_CHIPHI_BIZ` (5 cot)
4. **Gating:** `loan_method === "tieu_dung" && income_source_type !== "salary"` -> table-based form
5. **Bang tra no PA_TRANO: chi agriculture** (Q2 - Option A) — business tra deu hang thang, chi set flat placeholder (`HDTD.So goc tra/thang`, `HDTD.So lai ky dau`).
6. **Field `repayment_narrative` textarea** (Q3 - Option A) — user nhap tay text mo ta dac thu ("Tu loi nhuan hoat dong trong Cat tuong tren 7 sao..." hoac "Tu hoat dong kinh doanh ban le thuoc tai 2 dia diem..."). Fallback rong neu khong nhap.
7. **3 file .docx rieng theo income source** (Q4 - Option C):
   - `2268.02A tieu dung salary.docx` — giu nguyen file hien tai (rename hoac keep path)
   - `2268.02A tieu dung agriculture.docx` — template moi co 2 bang (PA_CHIPHI_AGRI + PA_TRANO)
   - `2268.02A tieu dung business.docx` — template moi co 1 bang (PA_CHIPHI_BIZ)
   - Registry them field `incomeSources?: IncomeSourceType[]`, filter template theo method + source
8. **Reuse `calcRepaymentSchedule`** cho agriculture (theo nam)

## Scope

### In-scope
- Types: 2 types (AgricultureItem, BusinessRevenueRow) voi flag hierarchy + 11 flat fields + `repayment_narrative`
- UI: `LoanPlanTieuDungSection` 3 branch (salary | agriculture | business) + textarea narrative
- Builder: dispatch 3-way, 2 loop `PA_CHIPHI_AGRI` + `PA_CHIPHI_BIZ`, PA_TRANO chi cho agriculture
- Registry: 2 placeholder loop groups + flat placeholders + field `incomeSources` filter
- Template DOCX: 3 file rieng (salary/agriculture/business) — agriculture + business la file moi tao

### Out-of-scope (YAGNI)
- Rental (cho thue) income — defer, cau truc khac
- Mix multi-source — 1 ho so chi 1 nguon
- Narrative generation tu dong — user nhap tay phan text mo ta
- Prisma schema migration (khong can)

## Phases

| Phase | Mo ta | Effort | Status |
|-------|-------|--------|--------|
| 1 | Reuse audit + data model decision | 1h | pending |
| 2 | Types + schema + whitelist | 1h | pending |
| 3 | UI conditional 3-way (salary / agriculture / business) | 3h | pending |
| 4 | Builder dispatch + 2 loop (PA_CHIPHI_AGRI, PA_CHIPHI_BIZ) | 2h | pending |
| 5 | Placeholder registry + template wiring + docs | 1h | pending |
| 6 | Testing + manual DOCX verification | 1h | pending |

## Phase Details

-> [Phase 1](./phase-01-reuse-audit-and-gating.md)
-> [Phase 2](./phase-02-types-schema-whitelist.md)
-> [Phase 3](./phase-03-ui-conditional-3way-form.md)
-> [Phase 4](./phase-04-builder-dispatch-agriculture-business.md)
-> [Phase 5](./phase-05-template-placeholder-wiring.md)
-> [Phase 6](./phase-06-testing-verification.md)

## Dependencies

- Phase 2 depends on Phase 1
- Phase 3, 4 depend on Phase 2
- Phase 5 depends on Phase 4
- Phase 6 depends on all

## Risks

- Template DOCX phai duoc user update thu cong (2 bang moi + loop PA_TRANO) -> huong dan ro trong phase 5
- Hierarchy (group header vs sub-item) co the phuc tap hoa form UX -> flag `isGroupHeader` + nested display
- Business co the co >1 nhom lon (I, II, III...) -> data structure phai flexible (array of groups, moi group co sub-items)

## Sample Reference Files
- `report_assets/KHCN templates/Ho Phuoc Da_Bao cao de xuat cho vay_2026-01-10.docx` (agriculture)
- `report_assets/KHCN templates/Le Huu Duong_Bao cao de xuat cho vay_2026-03-13.docx` (business)

## Related Reports
- [Scout report](../reports/scout-260420-1525-khcn-tieu-dung-nguon-tra-no-nong-nghiep.md)
- [Greenhouse template plan (reference)](../260321-1408-khcn-greenhouse-loan-plan-template/plan.md)
