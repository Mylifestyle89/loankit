/**
 * Data builder helpers for KHCN report template placeholders.
 * Each builder populates a specific group of placeholders from DB data.
 * Extracted from khcn-report.service.ts for modularity.
 */
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";


type Data = Record<string, unknown>;

// ── Customer aliases (flat fields used across many templates) ──

export function buildCustomerAliases(c: {
  customer_name: string;
  cccd?: string | null;
  cccd_old?: string | null;
  cccd_issued_date?: string | null;
  cccd_issued_place?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
}, data: Data) {
  // Alias: many templates use [CMND] instead of [CCCD]
  data["CMND"] = c.cccd ?? "";
  data["CMND cũ"] = c.cccd_old ?? "";
  data["Ngày cấp"] = c.cccd_issued_date ?? "";
  data["Nơi cấp"] = c.cccd_issued_place ?? "";
  data["Loại giấy tờ tùy thân"] = c.cccd ? "CCCD" : "";
  data["Danh xưng"] = c.gender === "male" ? "Ông" : c.gender === "female" ? "Bà" : "";
  // "Tên gọi in hoa" is set by buildBranchStaffData (branch name in header)
  data["TÊN KHÁCH HÀNG"] = c.customer_name?.toUpperCase() ?? "";
  data["Tên khách hàng in hoa"] = c.customer_name?.toUpperCase() ?? "";
  data["Nơi thường trú"] = c.address ?? "";
  data["Điện thoại"] = c.phone ?? "";
}

// ── Branch & Staff fields ──

export function buildBranchStaffData(
  branch: {
    name?: string; name_uppercase?: string | null; address?: string | null;
    branch_code?: string | null; phone?: string | null; fax?: string | null;
    tax_code?: string | null; district?: string | null; province?: string | null;
  } | null,
  staff: {
    relationship_officer?: string | null; appraiser?: string | null;
    approver_name?: string | null; approver_title?: string | null;
  },
  data: Data,
) {
  data["Tên chi nhánh/PGD"] = branch?.name ?? "";
  data["TÊN CHI NHÁNH/PGD"] = branch?.name_uppercase ?? branch?.name?.toUpperCase() ?? "";
  data["Mã CN"] = branch?.branch_code ?? "";
  data["Địa chỉ trụ sở"] = branch?.address ?? "";
  data["Địa danh"] = branch?.district ?? branch?.province ?? "";
  data["Địa bàn"] = branch?.province ?? "";
  data["Fax"] = branch?.fax ?? "";
  data["Mã số thuế CN"] = branch?.tax_code ?? "";
  data["Ngày cấp MST"] = ""; // Filled via override if applicable
  data["Nơi cấp MST"] = ""; // Filled via override if applicable

  // Staff
  data["Tên người dùng"] = staff.relationship_officer ?? "";
  data["Người kiểm soát"] = staff.appraiser ?? "";
  data["Người phê duyệt"] = staff.approver_name ?? "";
  data["Người phê duyệt in hoa"] = (staff.approver_name ?? "").toUpperCase();
  data["Chức vụ NPD"] = staff.approver_title ?? "";
  data["Danh xưng NPD"] = ""; // Not tracked
}

// ── Extended Loan (HĐTD) fields ──

export function buildLoanExtendedData(
  loan: {
    loanAmount: number;
    interestRate?: number | null;
    lending_method?: string | null; tcmblm_reason?: string | null;
    interest_method?: string | null; principal_schedule?: string | null;
    interest_schedule?: string | null; policy_program?: string | null;
    total_capital_need?: number | null; equity_amount?: number | null;
    cash_equity?: number | null; labor_equity?: number | null;
    other_loan?: number | null; other_asset_equity?: number | null;
    expected_revenue?: number | null; expected_cost?: number | null;
    expected_profit?: number | null; from_project?: string | null;
    other_income?: string | null; customer_rating?: string | null;
    debt_group?: string | null; scoring_period?: string | null;
    collateralValue?: number | null; securedObligation?: number | null;
    prior_contract_number?: string | null; prior_contract_date?: string | null;
    prior_outstanding?: number | null;
  },
  data: Data,
) {
  data["HĐTD.Bằng chữ"] = numberToVietnameseWords(loan.loanAmount);
  data["HĐTD.số tiền vay"] = loan.loanAmount; // lowercase alias in Bia HS
  data["HĐTD.Phương thức áp dụng LS"] = loan.interest_method ?? "";
  data["HĐTD.Định kỳ trả gốc"] = loan.principal_schedule ?? "";
  data["HĐTD.Định kỳ trả lãi"] = loan.interest_schedule ?? "";
  // Lãi suất chậm trả & quá hạn — set by khcn-report.service.ts, keep existing if already set
  if (!data["HĐTD.Lãi suất chậm trả"]) data["HĐTD.Lãi suất chậm trả"] = "";
  if (!data["HĐTD.Lãi suất quá hạn"]) data["HĐTD.Lãi suất quá hạn"] = "";
  data["HĐTD.Phí khác (nếu có)"] = "";
  data["HĐTD.Bổ sung vào HĐTD"] = "";
  data["HĐTD.Bổ sung BCĐX cho vay"] = "";
  data["HĐTD.Giấy tờ ủy quyền"] = "";
  // TNCV = Tổng nhu cầu vốn (alias bằng chữ)
  data["HĐTD.TNCV bằng chữ"] = loan.total_capital_need
    ? numberToVietnameseWords(Number(loan.total_capital_need))
    : "";
  data["HĐTD.Ngày giao/nhận"] = "";
  data["HĐTD.STT"] = "";

  // Chương trình cho vay — policy_program may contain multiple, map first 4 slots
  const programs = (loan.policy_program ?? "").split(";").map((s) => s.trim());
  data["HĐTD.Chương trình cho vay 1"] = programs[0] ?? "";
  data["HĐTD.Chương trình cho vay 2"] = programs[1] ?? "";
  data["HĐTD.Chương trình cho vay 3"] = programs[2] ?? "";
  data["HĐTD.Chương trình cho vay 4"] = programs[3] ?? "";

  // Tài chính minh bạch
  data["HĐTD.Tài chính minh bạch, LM"] = loan.tcmblm_reason ? "Có" : "";
  data["HĐTD.Lý do đáp ứng/không đáp ứng TCMBLM"] = loan.tcmblm_reason ?? "";

  // Vốn đối ứng & nguồn vốn
  data["HĐTD.Tổng nhu cầu vốn"] = loan.total_capital_need ?? "";
  data["HĐTD.Vốn đối ứng"] = loan.equity_amount ?? "";
  data["HĐTD.Tỷ lệ vốn đối ứng"] = loan.total_capital_need && loan.equity_amount
    ? `${Math.round((loan.equity_amount / loan.total_capital_need) * 100)}%`
    : "";
  data["HĐTD.Tr.đó: Vốn bằng tiền"] = loan.cash_equity ?? "";
  // Fallback: tính labor_equity = equity_amount - cash_equity nếu chưa lưu
  const laborEquity = loan.labor_equity
    ?? (loan.equity_amount != null && loan.cash_equity != null
      ? Math.max(0, Number(loan.equity_amount) - Number(loan.cash_equity))
      : "");
  data["HĐTD.Vốn bằng sức lao động"] = laborEquity;
  data["HĐTD.Vốn vay TCTD khác"] = loan.other_loan ?? "";
  data["HĐTD.Vốn bằng tài sản khác"] = loan.other_asset_equity ?? "";

  // Hiệu quả
  data["HĐTD.Tổng doanh thu dự kiến"] = loan.expected_revenue ?? "";
  data["HĐTD.Tổng chi phí dự kiến"] = loan.expected_cost ?? "";
  data["HĐTD.Lợi nhuận dự kiến"] = loan.expected_profit ?? "";
  data["HĐTD.Từ phương án, dự án"] = loan.from_project ?? "";
  data["HĐTD.Thu nhập khác"] = loan.other_income ?? "";

  // Xếp hạng
  data["HĐTD.Xếp hạng khách hàng"] = loan.customer_rating ?? "";
  data["HĐTD.Nhóm nợ"] = loan.debt_group ?? "";
  data["HĐTD.Kỳ chấm điểm"] = loan.scoring_period ?? "";

  // TSBĐ tổng hợp bằng chữ
  data["HĐTD.TGTTSBĐ bằng chữ"] = loan.collateralValue
    ? numberToVietnameseWords(loan.collateralValue)
    : "";
  data["HĐTD.TNVBĐ bằng chữ"] = loan.securedObligation
    ? numberToVietnameseWords(loan.securedObligation)
    : "";
  data["HĐTD.TNVBĐTĐ bằng chữ"] = loan.securedObligation
    ? numberToVietnameseWords(loan.securedObligation)
    : "";
  data["HĐTD.Tổng nghĩa vụ bảo đảm tối đa"] = loan.securedObligation ?? "";
  data["HĐTD.Tổng Nghĩa vụ bảo đảm tối đa"] = loan.securedObligation ?? "";

  // Dư nợ tín dụng — populated separately from credit info
  data["HĐTD.Dư nợ của KH và NLQ tại Agribank"] = "";
  data["HĐTD.Dư nợ tại TCTD khác"] = "";

  // HĐ cũ (gia hạn, tái cơ cấu)
  data["PA.HĐ cũ Số"] = loan.prior_contract_number ?? "";
  data["PA.HĐ cũ Ngày"] = loan.prior_contract_date ?? "";
  data["PA.Dư nợ cũ"] = loan.prior_outstanding ?? "";
  data["HĐTD.Số HĐ cũ"] = loan.prior_contract_number ?? "";
  data["HĐTD.Ngày HĐ cũ"] = loan.prior_contract_date ?? "";
}

// ── Extended Disbursement (GN) fields ──

export function buildDisbursementExtendedData(
  disb: {
    currentOutstanding?: number | null; totalOutstanding?: number | null;
    debtAmount?: number | null; amount: number;
    supportingDoc?: string | null;
  } | null,
  data: Data,
) {
  if (!disb) return;
  data["GN.Tổng dư nợ"] = disb.totalOutstanding ?? disb.currentOutstanding ?? "";
  data["GN.DNHT bằng chữ"] = disb.currentOutstanding
    ? numberToVietnameseWords(disb.currentOutstanding)
    : "";
  data["GN.TDN bằng chữ"] = disb.totalOutstanding
    ? numberToVietnameseWords(disb.totalOutstanding)
    : "";
  data["GN.Tài liệu chứng minh"] = disb.supportingDoc ?? "";
  data["GN.Tiền mặt"] = ""; // Not tracked separately
}

// ── Extended UNC (Beneficiary) fields in loop ──

export function buildBeneficiaryLoopData(
  beneficiaries: Array<{
    name: string; accountNumber?: string | null; bankName?: string | null;
  }>,
) {
  return beneficiaries.map((b, i) => ({
    STT: i + 1,
    "Khách hàng thụ hưởng": b.name,
    "Số tài khoản": b.accountNumber ?? "",
    "Nơi mở tài khoản": b.bankName ?? "",
    // Extended fields from templates
    "Số tiền": "", // Filled from disbursement line or override
    "ST bằng chữ": "",
    "Nội dung": "",
    "CMND": "",
    "Ngày cấp": "",
    "Nơi cấp": "",
    "Địa chỉ": "",
  }));
}

// ── Helper: parse _owners JSON from properties ──

function parseOwners(raw?: string): Array<Record<string, string>> {
  try { return JSON.parse(raw ?? "[]"); } catch { return []; }
}

// ── Helper: build flat ĐSH.* owner fields from first owner ──

function buildOwnerFields(owners: Array<Record<string, string>>): Record<string, string> {
  if (owners.length === 0) return {};
  const o = owners[0];
  return {
    "ĐSH.Họ và tên": o.name ?? "",
    "ĐSH.Loại giấy tờ tùy thân": o.id_type ?? "",
    "ĐSH.CCCD": o.cccd ?? "",
    "ĐSH.CMND": o.cccd ?? "",
    "ĐSH.Nơi cấp CCCD": o.cccd_place ?? "",
    "ĐSH.Nơi cấp": o.cccd_place ?? "",
    "ĐSH.Ngày cấp CCCD": o.cccd_date ?? "",
    "ĐSH.Ngày cấp": o.cccd_date ?? "",
    "ĐSH.CMND cũ": o.cmnd_old ?? "",
    "ĐSH.Năm sinh": o.birth_year ?? "",
    "ĐSH.Địa chỉ thường trú": o.address ?? "",
    "ĐSH.Nơi thường trú": o.address ?? "",
    "ĐSH.Địa chỉ hiện tại": o.current_address ?? "",
    "ĐSH.Số điện thoại": o.phone ?? "",
  };
}

// ── Helper: extract land collateral fields from properties JSON ──

function extractLandFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
  index: number,
) {
  const p = JSON.parse(col.properties_json || "{}");

  const owners = parseOwners(p._owners);
  const o1 = owners[0] ?? {};

  return {
    STT: index + 1,
    "Tên TSBĐ": col.name,
    "Tên Giấy chứng nhận": p.certificate_name ?? "",
    "Tên giấy chứng nhận": p.certificate_name ?? "", // lowercase alias
    "Số seri": p.serial ?? p.serial_number ?? "",
    "Cấp ngày": p.certificate_issue_date ?? p.issued_date ?? "",
    "Cơ quan cấp": p.issuing_authority ?? "",
    "Số vào sổ": p.registry_number ?? "",
    "Địa chỉ đất": p.land_address ?? "",
    "Số thửa": p.lot_number ?? "",
    "Số tờ bản đồ": p.map_sheet ?? "",
    "Diện tích đất": p.land_area ?? "",
    "DTĐ bằng chữ": p.land_area
      ? numberToVietnameseWords(parseFloat(String(p.land_area).replace(/,/g, ".")), "mét vuông")
      : "",
    "Mục đích sử dụng": p.land_purpose ?? "",
    "Thời hạn sử dụng": p.land_use_term ?? p.usage_term ?? "",
    "Nguồn gốc": p.land_origin ?? p.origin ?? "",
    "Hình thức sở hữu": p.ownership_form ?? "",
    // Owner: first from _owners array, fallback to flat field
    "Tên chủ sở hữu TS": o1.name ?? p.owner_name ?? "",
    "Tên chủ sở hữu TS in hoa": (o1.name ?? p.owner_name ?? "").toUpperCase(),
    // House/building on land
    "Kết cấu nhà": p.house_structure ?? "",
    "Số tầng": p.floor_number ?? p.floors ?? "",
    "Diện tích XD": p.construction_area ?? "",
    "Diện tích sàn": p.floor_area ?? "",
    "Cấp nhà ở": p.house_level ?? p.house_grade ?? "",
    "Loại nhà ở": p.house_type ?? "",
    "Hình thức sở hữu nhà": p.house_ownership ?? "",
    "Thời hạn sở hữu": p.ownership_term ?? "",
    "Năm hoàn thành xây dựng": p.year_built ?? "",
    "Sử dụng chung": p.shared_area ?? "",
    "Sử dụng riêng": p.private_area ?? "",
    "Khái quát về lợi thế": p.advantage_summary ?? p.advantage ?? "",
    "Thời hạn XĐ lại GTTS": p.revaluation_deadline ?? p.revaluation_period ?? "",
    "Ghi chú": p.notes ?? "",
    "Mua bảo hiểm TSBĐ": p.insurance_status ?? p.insurance ?? "",
    "Tình trạng sử dụng TS": p.asset_usage_status ?? p.asset_condition ?? "",
    "Giấy tờ về quyền bề mặt": p.surface_rights_doc ?? "",
    // Thẩm định & khấu hao
    "Mục đích thẩm định TSBĐ": p.appraisal_purpose ?? "",
    "TSBĐ chính thức/bổ sung": p.collateral_category ?? "",
    "Hình thức sở hữu TSBĐ": p.collateral_ownership_form ?? "",
    "Mối quan hệ giữa chủ sở hữu TS với bên vay": p.owner_relationship ?? "",
    "Thời gian đã sử dụng": p.used_duration ?? "",
    "Thời gian sử dụng còn lại": p.remaining_duration ?? "",
    "Thời gian khấu hao": p.depreciation_period ?? "",
    "Tỷ lệ khấu hao": p.depreciation_rate ?? "",
    "Giá trị khấu hao hàng năm": p.annual_depreciation ?? "",
    "Giá trị còn lại": p.residual_value ?? "",
    // Xóa thế chấp (HĐTC cũ)
    "Số HĐTC cũ": p.old_mortgage_number ?? "",
    "Tên HĐTC cũ": p.old_mortgage_name ?? "",
    "Ngày ký HĐTC cũ": p.old_mortgage_date ?? "",
    "Ngày giao/nhận": p.handover_date ?? "",
    // Valuation
    "Tổng giá trị TS": col.total_value ?? "",
    "TGTTS bằng chữ": col.total_value ? numberToVietnameseWords(col.total_value) : "",
    "Nghĩa vụ bảo đảm": col.obligation ?? "",
    "Nghĩa vụ bảo đảm tối đa": col.obligation ?? "",
    "NVBĐ bằng chữ": col.obligation ? numberToVietnameseWords(col.obligation) : "",
    "NVBĐTĐ bằng chữ": col.obligation ? numberToVietnameseWords(col.obligation) : "",
    // Land valuation slots (multi-land-type)
    "Loại đất 1": p.land_type_1 ?? "", "Đơn giá đất 1": p.land_unit_price_1 ?? "", "Giá trị đất 1": p.land_value_1 ?? "",
    "Loại đất 2": p.land_type_2 ?? "", "Đơn giá đất 2": p.land_unit_price_2 ?? "", "Giá trị đất 2": p.land_value_2 ?? "",
    "Loại đất 3": p.land_type_3 ?? "", "Đơn giá đất 3": p.land_unit_price_3 ?? "", "Giá trị đất 3": p.land_value_3 ?? "",
    "Giá trị đất": p.land_value ?? "",
    "Đơn giá xây dựng": p.construction_unit_price ?? "",
    "Giá trị nhà": p.house_value ?? "",
    "Giá trị xây dựng ban đầu": p.initial_construction_value ?? "",
    "Công trình xây dựng khác": p.other_construction ?? "",
    "Giá trị Công trình XD khác": p.other_construction_value ?? "",
    // Văn bản sửa đổi — loop array (stored as _amendments JSON)
    ...(() => {
      try {
        const list: Array<{ name: string; number?: string; date: string }> = JSON.parse(p._amendments ?? "[]");
        const result: Record<string, unknown> = {};
        list.forEach((a, i) => {
          result[`Văn bản sửa đổi ${i + 1}`] = a.name ?? "";
          result[`Số văn bản sửa đổi ${i + 1}`] = a.number ?? "";
          result[`Ngày sửa đổi ${i + 1}`] = a.date ?? "";
        });
        // Flat first-entry aliases
        result["SĐ.Văn bản sửa đổi"] = list[0]?.name ?? "";
        result["SĐ.Số văn bản sửa đổi"] = list[0]?.number ?? "";
        result["SĐ.Ngày sửa đổi"] = list[0]?.date ?? "";
        // Combined string for template: "Hợp đồng sửa đổi... số 3286/1 ngày 21/3/2024"
        if (list.length > 0) {
          result["Văn bản sửa đổi, bổ sung"] = list
            .map((a) => {
              let s = a.name ?? "";
              if (a.number) s += ` số ${a.number}`;
              if (a.date) s += ` ngày ${a.date}`;
              return s;
            })
            .join("; ");
        }
        return result;
      } catch { return {}; }
    })(),
    // HĐ thế chấp
    "BBXĐ giá trị tài sản số": p.valuation_report_number ?? "",
    "Tên HĐ thế chấp": p.mortgage_name ?? "",
    "TÊN HĐ THẾ CHẤP": (p.mortgage_name ?? "").toUpperCase(),
    "Số HĐ thế chấp": p.mortgage_contract ?? "",
    "Ngày ký HĐTC": p.mortgage_date ?? "",
    "Ngày HĐTC": p.mortgage_date ?? "", // alias
    // Fallback: only use legacy p.amendment_number if _amendments was empty
    ...(!p._amendments && p.amendment_number
      ? { "Văn bản sửa đổi, bổ sung": `Văn bản sửa đổi, bổ sung số ${p.amendment_number} ngày ${p.amendment_date ?? ""}` }
      : {}),
    "HĐ sửa đổi bổ sung số": p.amendment_number ?? "",
    "Ngày ký HĐ SĐBS": p.amendment_date ?? "",
    "Ngày định giá lại TS": p.revaluation_date ?? "",
    "Nơi đăng ký giao dịch BĐ": p.guarantee_registry_place ?? "",
    // Owner detail fields (ĐSH prefix — for BT3 templates)
    ...buildOwnerFields(owners),
  };
}

// ── Helper: emit indexed prefix fields (PREFIX_1.*, PREFIX_2.*...) ──

function emitIndexedFields(data: Data, prefix: string, fields: Record<string, unknown>, index: number): void {
  for (const [key, val] of Object.entries(fields)) {
    // ĐSH.* owner fields get their own indexed prefix
    if (key.startsWith("ĐSH.")) {
      data[`ĐSH_${index}.${key.substring(4)}`] = val;
    } else {
      data[`${prefix}_${index}.${key}`] = val;
    }
  }
}

/** Get count of collaterals matching a given type */
export function getCollateralCount(
  collaterals: Array<{ collateral_type: string }>,
  collateralType: string,
): number {
  return collaterals.filter((c) => c.collateral_type === collateralType).length;
}

// ── Helper: emit flat PREFIX.* fields from first item (backward compat) ──

function emitFlatFields(data: Data, prefix: string, fields: Record<string, unknown>): void {
  for (const [key, val] of Object.entries(fields)) {
    data[`${prefix}.${key}`] = val;
  }
}

// ── Collateral type-specific: SĐ (Sổ đỏ / QSD đất) ──

export function buildLandCollateralData(
  collaterals: Array<{
    collateral_type: string; name: string;
    total_value?: number | null; obligation?: number | null;
    properties_json: string;
  }>,
  data: Data,
) {
  const lands = collaterals.filter((c) => c.collateral_type === "qsd_dat");

  // Pre-compute all land fields once (avoids repeated JSON.parse + extractLandFields)
  const allLandFields = lands.map((col, i) => extractLandFields(col, i));

  // Loop arrays for templates: [#TSBD_CHI_TIET], [#SĐ]
  data["TSBD_CHI_TIET"] = allLandFields;
  data["SĐ"] = allLandFields;

  // Valuation breakdown loop — [#DINH_GIA]...[/DINH_GIA] for land types + house
  const valuationRows: Array<Record<string, unknown>> = [];
  for (const f of allLandFields) {
    const ff = f as Record<string, unknown>;
    for (let i = 1; i <= 5; i++) {
      const type = ff[`Loại đất ${i}`];
      if (!type) break;
      valuationRows.push({
        STT: valuationRows.length + 1,
        "Loại": type,
        "Diện tích": ff["Diện tích đất"] ?? "",
        "Đơn giá": ff[`Đơn giá đất ${i}`] ?? "",
        "Giá trị": ff[`Giá trị đất ${i}`] ?? "",
      });
    }
    if (ff["Giá trị nhà"] || ff["Diện tích sàn"]) {
      valuationRows.push({
        STT: valuationRows.length + 1,
        "Loại": "TS gắn liền với đất",
        "Diện tích": ff["Diện tích sàn"] ?? "",
        "Đơn giá": ff["Đơn giá xây dựng"] ?? "",
        "Giá trị": ff["Giá trị nhà"] ?? "",
      });
    }
  }
  data["DINH_GIA"] = valuationRows;

  // Consolidated valuation table — one row per land collateral
  data["TSBD_DINH_GIA"] = lands.map((col, i) => {
    const f = allLandFields[i];
    return {
      STT: i + 1,
      "Tên TSBĐ": col.name,
      "Số seri": f["Số seri"],
      "Địa chỉ đất": f["Địa chỉ đất"],
      "Diện tích đất": f["Diện tích đất"],
      "Giá trị đất": f["Giá trị đất"],
      "Giá trị nhà": f["Giá trị nhà"],
      "Tổng giá trị TS": col.total_value ?? "",
      "TGTTS bằng chữ": col.total_value ? numberToVietnameseWords(col.total_value) : "",
      "Nghĩa vụ bảo đảm tối đa": col.obligation ?? "",
      "NVBĐ bằng chữ": col.obligation ? numberToVietnameseWords(col.obligation) : "",
    };
  });

  // Indexed SĐ_1.*, SĐ_2.*... for multi-asset clone rendering
  allLandFields.forEach((fields, i) => {
    emitIndexedFields(data, "SĐ", fields, i + 1);
  });

  // Flat SĐ.* fields from first land collateral (backward compat)
  if (allLandFields.length > 0) {
    emitFlatFields(data, "SĐ", allLandFields[0]);
  }

  // Sum totals for land collaterals
  const landTotalValue = lands.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const landTotalObligation = lands.reduce((s, c) => s + (c.obligation ?? 0), 0);
  data["SĐ.Tổng giá trị tất cả TS"] = landTotalValue || "";
  data["SĐ.Tổng GTTS bằng chữ"] = landTotalValue ? numberToVietnameseWords(landTotalValue) : "";
  data["SĐ.Tổng NVBĐ"] = landTotalObligation || "";
  data["SĐ.Tổng NVBĐ bằng chữ"] = landTotalObligation ? numberToVietnameseWords(landTotalObligation) : "";
}

// ── Helper: extract movable collateral fields ──

function extractMovableFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
  index: number,
) {
  const p = JSON.parse(col.properties_json || "{}");
  const owners = parseOwners(p._owners);
  return {
    STT: index + 1,
    "Tên TSBĐ": col.name,
    "Nhãn hiệu": p.brand ?? p.nhan_hieu ?? "",
    "Biển kiểm soát": p.license_plate ?? p.bien_ks ?? "",
    "Số khung": p.chassis_number ?? p.so_khung ?? "",
    "Số máy": p.engine_number ?? p.so_may ?? "",
    "Màu sơn": p.color ?? p.mau_son ?? "",
    "Năm sản xuất": p.manufacture_year ?? p.year ?? p.nam_sx ?? "",
    "Số chỗ ngồi": p.seat_count ?? p.seats ?? p.so_cho ?? "",
    "Giấy đăng ký số": p.registration_number ?? p.giay_dk ?? "",
    "Ngày cấp ĐK": p.registration_date ?? p.cap_ngay ?? "",
    "Nơi cấp ĐK": p.registration_place ?? p.co_quan_cap ?? "",
    "Giá trị tài sản": col.total_value ?? "",
    "GTTS bằng chữ": col.total_value ? numberToVietnameseWords(col.total_value) : "",
    "Nghĩa vụ bảo đảm": col.obligation ?? "",
    "Nghĩa vụ bảo đảm tối đa": col.obligation ?? "",
    "NVBĐ bằng chữ": col.obligation ? numberToVietnameseWords(col.obligation) : "",
    "Số HĐ thế chấp": p.mortgage_contract ?? p.mortgage_contract_number ?? "",
    "Tên HĐ thế chấp": p.mortgage_name ?? p.mortgage_contract_name ?? "",
    "Ngày ký HĐTC": p.mortgage_date ?? "",
    "Văn bản sửa đổi, bổ sung": (() => {
      try {
        const list: Array<{ name: string; date: string }> = JSON.parse(p._amendments ?? "[]");
        if (list.length > 0) return list.map((a) => `${a.name}${a.date ? ` ngày ${a.date}` : ""}`).join("; ");
      } catch { /* fallback */ }
      return p.amendment_number ? `Văn bản sửa đổi, bổ sung số ${p.amendment_number} ngày ${p.amendment_date ?? ""}` : "";
    })(),
    "Nơi ĐKGD bảo đảm": p.guarantee_registry_place ?? "",
    "Mua bảo hiểm TSBĐ": p.insurance_status ?? p.insurance ?? "",
    "Số tiền bảo hiểm": p.insurance_amount ?? "",
    "Thời điểm gia hạn BH": p.insurance_renewal_date ?? "",
    ...buildOwnerFields(owners),
  };
}

// ── Collateral type-specific: ĐS (Động sản) ──

export function buildMovableCollateralData(
  collaterals: Array<{
    collateral_type: string; name: string;
    total_value?: number | null; obligation?: number | null;
    properties_json: string;
  }>,
  data: Data,
) {
  const vehicles = collaterals.filter((c) => c.collateral_type === "dong_san");

  // Pre-compute all movable fields once (avoids repeated JSON.parse)
  const allFields = vehicles.map((col, i) => extractMovableFields(col, i));

  // Loop arrays for templates: [#DS_CHI_TIET], [#ĐS]
  data["DS_CHI_TIET"] = allFields;
  data["ĐS"] = allFields;
  allFields.forEach((fields, i) => {
    emitIndexedFields(data, "ĐS", fields, i + 1);
  });

  // Flat ĐS.* fields from first vehicle (backward compat)
  if (allFields.length > 0) {
    emitFlatFields(data, "ĐS", allFields[0]);
  }

  // Sum totals for movable collaterals
  const movTotalValue = vehicles.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const movTotalObl = vehicles.reduce((s, c) => s + (c.obligation ?? 0), 0);
  data["ĐS.Tổng giá trị tất cả TS"] = movTotalValue || "";
  data["ĐS.Tổng GTTS bằng chữ"] = movTotalValue ? numberToVietnameseWords(movTotalValue) : "";
  data["ĐS.Tổng NVBĐ"] = movTotalObl || "";
  data["ĐS.Tổng NVBĐ bằng chữ"] = movTotalObl ? numberToVietnameseWords(movTotalObl) : "";
}

// ── Helper: extract savings collateral fields ──

function extractSavingsFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
) {
  const p = JSON.parse(col.properties_json || "{}");
  return {
    "Tên TSBĐ": col.name,
    "Số seri": p.serial ?? "",
    "Tổ chức phát hành": p.issuer ?? "",
    "Kỳ hạn": p.term ?? "",
    "Số dư": p.balance ?? "",
    "Lãi suất": p.interest_rate ?? "",
    "Ngày phát hành": p.issue_date ?? "",
    "Ngày đến hạn": p.maturity_date ?? "",
    "Mức vay tối đa": p.max_loan ?? "",
    "Giá trị tài sản": col.total_value ?? "",
    "Nghĩa vụ bảo đảm": col.obligation ?? "",
  };
}

// ── Collateral type-specific: TK (Tiết kiệm) ──

export function buildSavingsCollateralData(
  collaterals: Array<{
    collateral_type: string; name: string;
    total_value?: number | null; obligation?: number | null;
    properties_json: string;
  }>,
  data: Data,
) {
  const items = collaterals.filter((c) => c.collateral_type === "tiet_kiem");

  // Indexed TK_1.*, TK_2.*... + flat TK.* from first (backward compat)
  const allFields = items.map((col) => extractSavingsFields(col));
  allFields.forEach((fields, i) => {
    emitIndexedFields(data, "TK", fields, i + 1);
  });
  if (allFields.length > 0) {
    emitFlatFields(data, "TK", allFields[0]);
  }

  const tkTotalValue = items.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const tkTotalObl = items.reduce((s, c) => s + (c.obligation ?? 0), 0);
  data["TK.Tổng giá trị tất cả TS"] = tkTotalValue || "";
  data["TK.Tổng GTTS bằng chữ"] = tkTotalValue ? numberToVietnameseWords(tkTotalValue) : "";
  data["TK.Tổng NVBĐ"] = tkTotalObl || "";
  data["TK.Tổng NVBĐ bằng chữ"] = tkTotalObl ? numberToVietnameseWords(tkTotalObl) : "";
}

// ── Helper: extract other collateral fields ──

function extractOtherFields(
  col: { name: string; total_value?: number | null; obligation?: number | null; properties_json: string },
) {
  const p = JSON.parse(col.properties_json || "{}");
  return {
    "Tên TSBĐ": col.name,
    "Mua bảo hiểm TSBĐ": p.insurance ?? "",
    "Hiện trạng tài sản": p.asset_status ?? "",
    "Tính thanh khoản": p.liquidity ?? "",
    "Tính pháp lý": p.legality ?? "",
    "Giá trị tài sản": col.total_value ?? "",
    "Nghĩa vụ bảo đảm": col.obligation ?? "",
  };
}

// ── Collateral type-specific: TSK (Tài sản khác) ──

export function buildOtherCollateralData(
  collaterals: Array<{
    collateral_type: string; name: string;
    total_value?: number | null; obligation?: number | null;
    properties_json: string;
  }>,
  data: Data,
) {
  const items = collaterals.filter((c) => c.collateral_type === "tai_san_khac");

  // Indexed TSK_1.*, TSK_2.*... + flat TSK.* from first (backward compat)
  const allFields = items.map((col) => extractOtherFields(col));
  allFields.forEach((fields, i) => {
    emitIndexedFields(data, "TSK", fields, i + 1);
  });
  if (allFields.length > 0) {
    emitFlatFields(data, "TSK", allFields[0]);
  }

  const tskTotalValue = items.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const tskTotalObl = items.reduce((s, c) => s + (c.obligation ?? 0), 0);
  data["TSK.Tổng giá trị tất cả TS"] = tskTotalValue || "";
  data["TSK.Tổng GTTS bằng chữ"] = tskTotalValue ? numberToVietnameseWords(tskTotalValue) : "";
  data["TSK.Tổng NVBĐ"] = tskTotalObl || "";
  data["TSK.Tổng NVBĐ bằng chữ"] = tskTotalObl ? numberToVietnameseWords(tskTotalObl) : "";
}

// ── CoBorrower (TV = Thành viên đồng vay) ──

export function buildCoBorrowerData(
  coBorrowers: Array<{
    title?: string | null; full_name: string; id_type?: string | null;
    id_number?: string | null; id_issued_date?: string | null;
    id_old?: string | null; id_issued_place?: string | null;
    birth_year?: string | null; phone?: string | null;
    current_address?: string | null; permanent_address?: string | null;
    relationship?: string | null; agribank_debt?: string | null;
  }>,
  data: Data,
) {
  // First co-borrower as flat TV.* fields (most templates expect single)
  const first = coBorrowers[0];
  if (first) {
    data["TV.STT"] = "1";
    data["TV.Danh xưng"] = first.title ?? "";
    data["TV.Họ và tên"] = first.full_name;
    data["TV.Họ và tên in hoa"] = first.full_name.toUpperCase();
    data["TV.Loại giấy tờ tùy thân"] = first.id_type ?? "";
    data["TV.CMND"] = first.id_number ?? "";
    data["TV.CMND cũ"] = first.id_old ?? "";
    data["TV.Ngày cấp"] = first.id_issued_date ?? "";
    data["TV.Nơi cấp"] = first.id_issued_place ?? "";
    data["TV.Năm sinh"] = first.birth_year ?? "";
    data["TV.Số điện thoại"] = first.phone ?? "";
    data["TV.Địa chỉ hiện tại"] = first.current_address ?? "";
    data["TV.Nơi thường trú"] = first.permanent_address ?? "";
    data["TV.Mối quan hệ với KH vay"] = first.relationship ?? "";
    data["TV.Dư nợ tại Agribank"] = first.agribank_debt ?? "";
  }
  // TV loop markers (for templates using [#TV]...[/TV])
  data["TV"] = coBorrowers.map((cb, i) => ({
    STT: i + 1,
    "Danh xưng": cb.title ?? "",
    "Họ và tên": cb.full_name,
    "Họ và tên in hoa": cb.full_name.toUpperCase(),
    "Loại giấy tờ tùy thân": cb.id_type ?? "",
    "CMND": cb.id_number ?? "",
    "CMND cũ": cb.id_old ?? "",
    "Ngày cấp": cb.id_issued_date ?? "",
    "Nơi cấp": cb.id_issued_place ?? "",
    "Năm sinh": cb.birth_year ?? "",
    "Số điện thoại": cb.phone ?? "",
    "Địa chỉ hiện tại": cb.current_address ?? "",
    "Nơi thường trú": cb.permanent_address ?? "",
    "Mối quan hệ với KH vay": cb.relationship ?? "",
    "Dư nợ tại Agribank": cb.agribank_debt ?? "",
  }));
}

// ── RelatedPerson (NLQ = Người liên quan) ──

export function buildRelatedPersonData(
  relatedPersons: Array<{
    name: string; id_number?: string | null; address?: string | null;
    relation_type?: string | null; agribank_debt?: string | null;
  }>,
  data: Data,
) {
  // Flat NLQ.* fields from first entry + NLQ.TV.STT alias
  const first = relatedPersons[0];
  if (first) {
    data["NLQ.Tên tổ chức/Cá nhân"] = first.name;
    data["NLQ.Số ĐKKD/CMND"] = first.id_number ?? "";
    data["NLQ.Địa chỉ"] = first.address ?? "";
    data["NLQ.Mối liên quan"] = first.relation_type ?? "";
    data["NLQ.Dư nợ tại Agribank"] = first.agribank_debt ?? "";
    data["NLQ.TV.STT"] = "1";
  }
  // NLQ loop
  data["NLQ"] = relatedPersons.map((rp, i) => ({
    STT: i + 1,
    "TV.STT": i + 1,
    "Tên tổ chức/Cá nhân": rp.name,
    "Số ĐKKD/CMND": rp.id_number ?? "",
    "Địa chỉ": rp.address ?? "",
    "Mối liên quan": rp.relation_type ?? "",
    "Dư nợ tại Agribank": rp.agribank_debt ?? "",
  }));
}

// ── Helper: split credits by short/long term and emit prefixed debt breakdown ──

type CreditEntry = {
  loan_term?: string | null; debt_amount?: string | null;
  loan_purpose?: string | null; repayment_source?: string | null;
};

function emitCreditTermBreakdown(credits: CreditEntry[], prefix: string, data: Data): void {
  if (credits.length === 0) return;
  const shortTerm = credits.filter((c) => (c.loan_term ?? "").includes("ngắn"));
  const longTerm = credits.filter((c) => !(c.loan_term ?? "").includes("ngắn"));
  const sumDebt = (arr: CreditEntry[]) => arr.reduce((s, c) => s + (parseFloat(c.debt_amount ?? "0") || 0), 0);
  data[`${prefix}.Dư nợ ngắn hạn`] = sumDebt(shortTerm) || "";
  data[`${prefix}.Dư nợ trung dài hạn`] = sumDebt(longTerm) || "";
  data[`${prefix}.Mục đích ngắn hạn`] = shortTerm.map((c) => c.loan_purpose).filter(Boolean).join("; ") || "";
  data[`${prefix}.Mục đích trung dài hạn`] = longTerm.map((c) => c.loan_purpose).filter(Boolean).join("; ") || "";
  data[`${prefix}.Nguồn trả nợ`] = credits.map((c) => c.repayment_source).filter(Boolean).join("; ") || "";
}

// ── CreditAtAgribank (VBA = Vay vốn tại Agribank) ──

export function buildCreditAgribankData(
  credits: Array<{
    branch_name?: string | null; debt_group?: string | null;
    loan_term?: string | null; debt_amount?: string | null;
    loan_purpose?: string | null; repayment_source?: string | null;
  }>,
  data: Data,
) {
  data["VBA"] = credits.map((c, i) => ({
    STT: i + 1,
    "Tại chi nhánh/PGD": c.branch_name ?? "",
    "Thời hạn vay": c.loan_term ?? "",
    "Dư nợ": c.debt_amount ?? "",
    "Mục đích vay": c.loan_purpose ?? "",
    "Nguồn trả nợ": c.repayment_source ?? "",
    "Nhóm nợ": c.debt_group ?? "",
  }));
  const totalDebt = credits.reduce((s, c) => s + (parseFloat(c.debt_amount ?? "0") || 0), 0);
  if (totalDebt) data["HĐTD.Dư nợ của KH và NLQ tại Agribank"] = totalDebt;
  data["VBA.Tổng dư nợ"] = totalDebt || "";
  emitCreditTermBreakdown(credits, "VBA", data);
}

// ── CreditAtOther (TCTD = Tổ chức tín dụng khác) ──

export function buildCreditOtherData(
  credits: Array<{
    institution_name?: string | null; debt_group?: string | null;
    loan_term?: string | null; debt_amount?: string | null;
    loan_purpose?: string | null; repayment_source?: string | null;
  }>,
  data: Data,
) {
  const first = credits[0];
  if (first) {
    data["TCTD.Tên TCTD"] = first.institution_name ?? "";
    data["TCTD.Nhóm nợ"] = first.debt_group ?? "";
    data["TCTD.Thời hạn vay"] = first.loan_term ?? "";
    data["TCTD.Dư nợ"] = first.debt_amount ?? "";
    data["TCTD.Mục đích vay"] = first.loan_purpose ?? "";
    data["TCTD.Nguồn trả nợ"] = first.repayment_source ?? "";
  }
  const totalDebt = credits.reduce((s, c) => s + (parseFloat(c.debt_amount ?? "0") || 0), 0);
  if (totalDebt) data["HĐTD.Dư nợ tại TCTD khác"] = totalDebt;
  data["TCTD.Tổng dư nợ"] = totalDebt || "";
  emitCreditTermBreakdown(credits, "TCTD", data);
}

// ── Extended Loan Plan (PA) cost items ──

export function buildLoanPlanExtendedData(
  plan: {
    name: string; financials_json: string;
    cost_items_json: string; revenue_items_json: string;
  } | null,
  data: Data,
) {
  if (!plan) return;

  let financials: Record<string, unknown>;
  try { financials = JSON.parse(plan.financials_json || "{}"); }
  catch { return; }

  // Extended PA flat fields
  data["PA.Mục đích vay"] = financials.purpose ?? "";
  data["PA.Thời hạn vay"] = financials.loanTerm ?? "";
  // Format interest rate: 0.09 → "9%/năm"
  const rawRate = financials.interestRate;
  data["PA.Lãi suất vay"] = typeof rawRate === "number" && rawRate > 0
    ? `${parseFloat((rawRate < 1 ? rawRate * 100 : rawRate).toFixed(2))}%/năm`
    : rawRate ?? "";
  data["PA.Lãi vay NH"] = financials.interestCost ?? "";
  data["PA.Lãi vay"] = financials.interestCost ?? "";
  data["PA.Thu nhập"] = financials.income ?? financials.revenue ?? "";
  data["PA.Sản lượng"] = financials.yield ?? "";
  data["PA.Số sào đất"] = financials.landArea ?? "";
  data["PA.Địa chỉ đất NN"] = financials.farmAddress ?? "";
  data["PA.Số tiền vay bằng chữ"] = financials.loanAmount
    ? numberToVietnameseWords(financials.loanAmount as number)
    : "";
  data["PA.Tổng nhu cầu vốn bằng chữ"] = financials.totalCost
    ? numberToVietnameseWords(financials.totalCost as number)
    : "";
  data["PA.Số tiền đặt cọc"] = financials.deposit ?? "";
  data["PA.Số HĐTD cũ"] = financials.oldContractNumber ?? "";
  data["PA.Ngày HĐTD cũ"] = financials.oldContractDate ?? "";
  data["PA.Số tiền hợp đồng cung ứng"] = financials.supplyContractAmount ?? "";
  data["PA.Số tiền hợp đồng cung ứng bằng chữ"] = financials.supplyContractAmount
    ? numberToVietnameseWords(financials.supplyContractAmount as number)
    : "";

  // Consolidated flat PA.* financials (single source of truth)
  data["PA.Tên phương án"] = plan.name;
  data["PA.Tổng nhu cầu vốn"] = financials.totalCost ?? "";
  data["PA.Số tiền vay"] = financials.loanAmount ?? "";
  data["PA.Vốn đối ứng"] = financials.counterpartCapital ?? "";
  // Auto-calculate counterpart ratio: vốn đối ứng / tổng nhu cầu vốn
  const cpCapital = Number(financials.counterpartCapital) || 0;
  const totalCost = Number(financials.totalCost) || Number(financials.loanNeed) || 0;
  const cpRatioRaw = financials.counterpartRatio ?? (totalCost > 0 ? cpCapital / totalCost : 0);
  const cpNum = typeof cpRatioRaw === "string" ? parseFloat(cpRatioRaw) : Number(cpRatioRaw) || 0;
  data["PA.Tỷ lệ vốn đối ứng"] = cpNum > 0
    ? `${parseFloat((cpNum < 1 ? cpNum * 100 : cpNum).toFixed(2))}%`
    : "";
  data["PA.Tỷ lệ vốn tự có"] = data["PA.Tỷ lệ vốn đối ứng"]; // alias
  data["PA.Tổng doanh thu dự kiến"] = financials.revenue ?? "";
  data["PA.Tổng chi phí dự kiến"] = financials.totalExpenses ?? financials.totalCost ?? "";
  data["PA.Lợi nhuận dự kiến"] = financials.profit ?? "";
  data["PA.Tổng chi phí trực tiếp"] = financials.totalDirectCost ?? "";
  data["PA.Tổng chi phí gián tiếp"] = financials.totalIndirectCost ?? "";
  data["PA.Tổng chi phí"] = financials.totalCost ?? "";
  data["PA.Thuế"] = financials.tax ?? "";
  data["PA.Nhu cầu vốn vay"] = financials.loanNeed ?? financials.loanAmount ?? "";
  data["PA.Vòng quay vốn"] = financials.turnoverCycles ?? "";

  // Build separate loop arrays + flat summary placeholders for cost/revenue table
  try {
    const costItems: Array<{ name: string; unit?: string; qty?: number; unitPrice?: number; unit_price?: number; amount?: number }> =
      JSON.parse(plan.cost_items_json || "[]");
    const revenueItems: Array<{ description: string; unit?: string; qty?: number; unitPrice?: number; unit_price?: number; amount?: number }> =
      JSON.parse(plan.revenue_items_json || "[]");

    // Row helper: add aliases for different template placeholder names
    const row = (r: Record<string, unknown>) => {
      const label = r["Hạng mục"] ?? "";
      return { ...r, "Mô tả": label, "KHOẢN MỤC": label, "Khoản mục": label, "Danh mục": label };
    };

    // PA_CHIPHI = loop chỉ các khoản chi phí trực tiếp (cost items)
    // PA_CHIPHI: cost items loop
    data["PA_CHIPHI"] = costItems.map((c, i) => row({
      STT: i + 1, "Hạng mục": c.name,
      ĐVT: c.unit ?? "",
      "Đơn giá": c.unitPrice ?? c.unit_price ?? "",
      "Số lượng": c.qty ?? "",
      "Thành tiền": c.amount ?? "",
    }));

    // PA_DOANHTHU: revenue items loop
    data["PA_DOANHTHU"] = revenueItems.map((r, i) => row({
      STT: i + 1, "Hạng mục": r.description,
      ĐVT: r.unit ?? "đ",
      "Đơn giá": r.unitPrice ?? r.unit_price ?? "",
      "Số lượng": r.qty ?? "",
      "Thành tiền": r.amount ?? "",
    }));

    // Calculate totals for flat placeholders (fixed rows in template)
    const totalDirectCost = costItems.reduce((s, c) => s + (c.amount ?? 0), 0);
    // Auto-calculate interest cost: rate × loanAmount × term(months)/12
    let interestCost = Number(financials.interestCost) || 0;
    if (!interestCost && rawRate && financials.loanAmount) {
      const rate = (rawRate as number) < 1 ? (rawRate as number) : (rawRate as number) / 100;
      const months = Number(financials.loanTerm) || 12;
      interestCost = Math.round(rate * Number(financials.loanAmount) * months / 12);
    }
    const tax = Number(financials.tax) || 0;
    const totalIndirectCost = interestCost + tax;
    const totalCostAll = totalDirectCost + totalIndirectCost;
    const totalRevenue = revenueItems.reduce((s, r) => s + (r.amount ?? 0), 0);
    const profit = totalRevenue - totalCostAll;

    // Format interest rate
    const rateStr = typeof rawRate === "number" && (rawRate as number) > 0
      ? `${parseFloat(((rawRate as number) < 1 ? (rawRate as number) * 100 : (rawRate as number)).toFixed(2))}%/năm`
      : "";

    // Flat placeholders for fixed rows in template
    data["PA.Tổng chi phí"] = totalCostAll || "";
    data["PA.Tổng chi phí trực tiếp"] = totalDirectCost || "";
    data["PA.Tổng chi phí gián tiếp"] = totalIndirectCost || "";
    data["PA.Lãi vay NH"] = interestCost || "";
    data["PA.Lãi vay"] = interestCost || "";
    data["PA.LS vay"] = rateStr; // lãi suất format cho cột đơn giá
    data["PA.Thuế"] = tax || "";
    data["PA.Tổng doanh thu dự kiến"] = totalRevenue || "";
    data["PA.Lợi nhuận dự kiến"] = profit;
    // Tổng nhu cầu vốn = tổng chi phí (trực tiếp + gián tiếp)
    if (totalCostAll > 0) {
      data["PA.Tổng nhu cầu vốn"] = totalCostAll;
      data["PA.Tổng nhu cầu vốn bằng chữ"] = numberToVietnameseWords(totalCostAll);
    }
  } catch {
    data["PA_CHIPHI"] = [];
    data["PA_DOANHTHU"] = [];
  }
}
