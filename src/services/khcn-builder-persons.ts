/**
 * KHCN builder: co-borrower (TV) and related person (NLQ) data.
 */
type Data = Record<string, unknown>;

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
  // TV loop — include both prefixed and unprefixed keys so
  // templates using [TV.Họ và tên] inside [#TV] loop resolve correctly
  data["TV"] = coBorrowers.map((cb, i) => {
    const item: Record<string, unknown> = {
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
    };
    for (const [k, v] of Object.entries(item)) {
      item[`TV.${k}`] = v;
    }
    return item;
  });
}

// ── RelatedPerson (NLQ = Người liên quan) ──

export function buildRelatedPersonData(
  rawPersons: Array<{
    name: string; id_number?: string | null; address?: string | null;
    relation_type?: string | null; agribank_debt?: string | null;
  }>,
  data: Data,
) {
  // Dedup by name + id_number to prevent duplicate rows in loop
  const seen = new Set<string>();
  const relatedPersons = rawPersons.filter((rp) => {
    const key = `${rp.name}|${rp.id_number ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  // NLQ loop — include both prefixed and unprefixed keys so
  // templates using [NLQ.Tên tổ chức/Cá nhân] inside [#NLQ] loop resolve correctly
  data["NLQ"] = relatedPersons.map((rp, i) => {
    const item: Record<string, unknown> = {
      STT: i + 1,
      "TV.STT": i + 1,
      "Tên tổ chức/Cá nhân": rp.name,
      "Số ĐKKD/CMND": rp.id_number ?? "",
      "Địa chỉ": rp.address ?? "",
      "Mối liên quan": rp.relation_type ?? "",
      "Dư nợ tại Agribank": rp.agribank_debt ?? "",
    };
    // Duplicate with NLQ. prefix for templates that use [NLQ.X] inside loop
    for (const [k, v] of Object.entries(item)) {
      item[`NLQ.${k}`] = v;
    }
    return item;
  });
}
