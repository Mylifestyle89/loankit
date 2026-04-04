import type { FieldVisibilityConfig } from "./field-visibility-types";

/**
 * Central config cho field visibility rules.
 * SỬA FILE NÀY khi cần thêm/bớt điều kiện hiển thị fields.
 *
 * Cách hoạt động:
 * - show_when: { key: value } — tất cả conditions phải khớp (AND)
 * - show_when: { key: ["a", "b"] } — key khớp bất kỳ value nào (OR within key)
 * - Không có rule = luôn hiển thị
 */
export const FIELD_VISIBILITY_CONFIG: FieldVisibilityConfig = {
  groups: {
    // ── Customer: KHDN (corporate) only ──
    "customer.corporate_fields": {
      description: "Fields chỉ hiển thị cho KHDN",
      show_when: { customer_type: "corporate" },
      fields: [
        "main_business",
        "charter_capital",
        "legal_representative_name",
        "legal_representative_title",
        "organization_type",
      ],
    },

    // ── Customer: KHCN (individual) only ──
    "customer.individual_fields": {
      description: "Fields chỉ hiển thị cho KHCN",
      show_when: { customer_type: "individual" },
      fields: [
        "gender",
        "cccd",
        "cccd_old",
        "cccd_issued_date",
        "cccd_issued_place",
        "date_of_birth",
        "phone",
        "bank_account",
        "bank_name",
        "cic_product_name",
        "cic_product_code",
      ],
    },
  },

  fields: {
    // ── Customer: Scan button (KHCN only) ──
    "customer.scan_button": {
      description: "Nút quét giấy tờ (chỉ KHCN)",
      show_when: { customer_type: "individual" },
    },
  },
};
