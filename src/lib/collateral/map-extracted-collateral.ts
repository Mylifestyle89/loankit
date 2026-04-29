/**
 * Maps ExtractedCollateral fields → CollateralItem.properties keys used by the form.
 * Converts all values to strings (form expects Record<string, string>).
 * Shared between DOCX import submit handler and AI paste extractor.
 */
export function mapExtractedToFormProperties(
  type: string,
  extracted: Record<string, unknown>,
): Record<string, string> {
  const s = (v: unknown): string => (v == null ? "" : String(v));

  if (type === "qsd_dat") {
    return {
      certificate_name: s(extracted.gcn_name),
      serial: s(extracted.certificate_serial),
      issuing_authority: s(extracted.gcn_issued_by),
      certificate_issue_date: s(extracted.gcn_issued_date),
      lot_number: s(extracted.lot_number),
      map_sheet: s(extracted.sheet_number),
      land_address: s(extracted.land_address),
      land_area: s(extracted.land_area),
      ownership_form: s(extracted.land_usage_form),
      land_purpose: s(extracted.land_usage_purpose),
      land_use_term: s(extracted.land_usage_duration),
      land_origin: s(extracted.land_origin),
      land_type_1: s(extracted.land_type_1),
      land_unit_price_1: s(extracted.land_unit_price_1),
      land_type_2: s(extracted.land_type_2),
      land_unit_price_2: s(extracted.land_unit_price_2),
      house_type: s(extracted.building_type),
      construction_area: s(extracted.building_built_area),
      floor_area: s(extracted.building_floor_area),
      house_structure: s(extracted.building_structure),
      house_ownership: s(extracted.building_ownership_form),
      house_level: s(extracted.building_grade),
      floor_number: s(extracted.building_floors),
      asset_usage_status: s(extracted.asset_condition),
      advantage_summary: s(extracted.liquidity_note),
      insurance_status: s(extracted.insurance_note),
    };
  }

  if (type === "dong_san") {
    return {
      registration_number: s(extracted.certificate_serial), // Giấy đăng ký số
      registration_place: s(extracted.gcn_issued_by),
      registration_date: s(extracted.gcn_issued_date),
      license_plate: s(extracted.registration_number),      // Biển kiểm soát
      brand: s(extracted.brand),
      model_code: s(extracted.model),
      color: s(extracted.color),
      manufacture_year: s(extracted.year),
      chassis_number: s(extracted.chassis_number),
      engine_number: s(extracted.engine_number),
      seat_count: s(extracted.seat_count),
      asset_usage_status: s(extracted.asset_condition),
      advantage_summary: s(extracted.liquidity_note),
      insurance_status: s(extracted.insurance_note),
    };
  }

  if (type === "tiet_kiem") {
    return {
      serial: s(extracted.savings_book_number),
      issuer: s(extracted.deposit_bank_name),
      balance: s(extracted.deposit_amount),
      issue_date: s(extracted.deposit_date),
    };
  }

  // tai_san_khac — stringify all
  return Object.fromEntries(
    Object.entries(extracted).map(([k, v]) => [k, s(v)]),
  );
}
