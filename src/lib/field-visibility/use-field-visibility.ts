import { useMemo } from "react";
import { FIELD_VISIBILITY_CONFIG } from "./field-visibility-config";
import type { ShowWhenCondition } from "./field-visibility-types";

/** Check if all conditions match against form data (AND logic) */
function matchesCondition(
  condition: ShowWhenCondition,
  formData: Record<string, unknown>,
): boolean {
  return Object.entries(condition).every(([key, expected]) => {
    const actual = formData[key];
    if (Array.isArray(expected)) {
      return expected.includes(String(actual));
    }
    return actual === expected;
  });
}

/**
 * Pure function: check if a field should be visible.
 * Checks direct field rules first, then group membership.
 * Returns true if no rule exists (default = visible).
 */
export function isFieldVisible(
  fieldKey: string,
  formData: Record<string, unknown>,
): boolean {
  const config = FIELD_VISIBILITY_CONFIG;

  // Check direct field rule
  const directRule = config.fields[fieldKey];
  if (directRule) {
    return matchesCondition(directRule.show_when, formData);
  }

  // Check group membership
  for (const group of Object.values(config.groups)) {
    if (group.fields.includes(fieldKey)) {
      return matchesCondition(group.show_when, formData);
    }
  }

  // No rule = always visible
  return true;
}

/**
 * React hook: returns visibility checker bound to current form data.
 * Usage: const isVisible = useFieldVisibility({ customer_type });
 *        {isVisible("cccd") && <Field ... />}
 */
export function useFieldVisibility(formData: Record<string, unknown>) {
  return useMemo(
    () => (fieldKey: string) => isFieldVisible(fieldKey, formData),
    [formData],
  );
}

/**
 * Check if an entire group is visible.
 * Usage: const showCorporate = useGroupVisibility("customer.corporate_fields", { customer_type });
 */
export function useGroupVisibility(
  groupKey: string,
  formData: Record<string, unknown>,
): boolean {
  return useMemo(() => {
    const group = FIELD_VISIBILITY_CONFIG.groups[groupKey];
    if (!group) return true;
    return matchesCondition(group.show_when, formData);
  }, [groupKey, formData]);
}
