/**
 * KHCN builder: shared collateral helper functions.
 * Used by land, movable, savings, and other collateral builders.
 */

export type Data = Record<string, unknown>;

// ── Helper: parse _owners JSON from properties ──

export function parseOwners(raw?: string): Array<Record<string, string>> {
  try {
    const list: Array<Record<string, string>> = JSON.parse(raw ?? "[]");
    // Filter out empty owner entries (no name or CCCD)
    return list.filter((o) => (o.name ?? "").trim() || (o.cccd ?? "").trim());
  } catch { return []; }
}

// ── Helper: build flat ĐSH.* owner fields from first owner ──

export function buildOwnerFields(owners: Array<Record<string, string>>): Record<string, unknown> {
  if (owners.length === 0) return {};
  const o = owners[0];
  // Map single owner entry — include both plain and ĐSH-prefixed keys
  // so templates work with [Họ và tên] or [ĐSH.Họ và tên] inside [#ĐSH] loop
  const mapOwner = (ow: Record<string, string>, idx: number) => ({
    STT: idx + 1,
    "Họ và tên": ow.name ?? "",
    "Họ và tên in hoa": (ow.name ?? "").toUpperCase(),
    "Loại giấy tờ tùy thân": ow.id_type ?? "",
    "CCCD": ow.cccd ?? "",
    "CMND": ow.cccd ?? "",
    "Nơi cấp CCCD": ow.cccd_place ?? "",
    "Nơi cấp": ow.cccd_place ?? "",
    "Ngày cấp CCCD": ow.cccd_date ?? "",
    "Ngày cấp": ow.cccd_date ?? "",
    "CMND cũ": ow.cmnd_old ?? "",
    "Năm sinh": ow.birth_year ?? "",
    "Địa chỉ thường trú": ow.address ?? "",
    "Nơi thường trú": ow.address ?? "",
    "Địa chỉ hiện tại": ow.current_address ?? "",
    "Số điện thoại": ow.phone ?? "",
    // ĐSH-prefixed aliases (templates use [ĐSH.Họ và tên] inside [#ĐSH] loop)
    "ĐSH.Họ và tên": ow.name ?? "",
    "ĐSH.Họ và tên in hoa": (ow.name ?? "").toUpperCase(),
    "ĐSH.Loại giấy tờ tùy thân": ow.id_type ?? "",
    "ĐSH.CCCD": ow.cccd ?? "",
    "ĐSH.CMND": ow.cccd ?? "",
    "ĐSH.Nơi cấp CCCD": ow.cccd_place ?? "",
    "ĐSH.Nơi cấp": ow.cccd_place ?? "",
    "ĐSH.Ngày cấp CCCD": ow.cccd_date ?? "",
    "ĐSH.Ngày cấp": ow.cccd_date ?? "",
    "ĐSH.CMND cũ": ow.cmnd_old ?? "",
    "ĐSH.Năm sinh": ow.birth_year ?? "",
    "ĐSH.Địa chỉ thường trú": ow.address ?? "",
    "ĐSH.Nơi thường trú": ow.address ?? "",
    "ĐSH.Địa chỉ hiện tại": ow.current_address ?? "",
    "ĐSH.Số điện thoại": ow.phone ?? "",
  });
  return {
    // Flat ĐSH.* from first owner (backward compat)
    "ĐSH.STT": owners.length > 1 ? "2" : "",
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
    // Loop array ĐSH for [#ĐSH]...[/ĐSH] — all owners
    "ĐSH": owners.map((ow, i) => mapOwner(ow, i)),
  };
}

// ── Helper: emit indexed prefix fields (PREFIX_1.*, PREFIX_2.*...) ──

export function emitIndexedFields(data: Data, prefix: string, fields: Record<string, unknown>, index: number): void {
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

export function emitFlatFields(data: Data, prefix: string, fields: Record<string, unknown>): void {
  for (const [key, val] of Object.entries(fields)) {
    data[`${prefix}.${key}`] = val;
  }
}
