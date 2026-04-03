/**
 * KHCN builder: customer aliases and branch/staff fields.
 */


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
  data["Số điện thoại"] = c.phone ?? "";
}

// ── Branch & Staff fields ──

export function buildBranchStaffData(
  branch: {
    name?: string; name_uppercase?: string | null; address?: string | null;
    branch_code?: string | null; phone?: string | null; fax?: string | null;
    tax_code?: string | null; tax_issued_date?: string | null; tax_issued_place?: string | null;
    district?: string | null; province?: string | null;
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
  data["Địa danh"] = branch?.district || branch?.province || "";
  data["Địa bàn"] = branch?.province || "";
  data["Điện thoại"] = branch?.phone ?? "";
  data["Điện thoại CN"] = branch?.phone ?? "";
  data["Fax"] = branch?.fax ?? "";
  data["Mã số thuế CN"] = branch?.tax_code ?? "";
  data["Ngày cấp MST"] = branch?.tax_issued_date ?? "";
  data["Nơi cấp MST"] = branch?.tax_issued_place ?? "";
  data["Tên gọi in hoa"] = branch?.name_uppercase ?? branch?.name?.toUpperCase() ?? "";

  // Staff
  data["Tên người dùng"] = staff.relationship_officer ?? "";
  data["Người kiểm soát"] = staff.appraiser ?? "";
  data["Người phê duyệt"] = staff.approver_name ?? "";
  data["Người phê duyệt in hoa"] = (staff.approver_name ?? "").toUpperCase();
  data["Chức vụ NPD"] = staff.approver_title ?? "";
  data["Danh xưng NPD"] = ""; // Not tracked
}
