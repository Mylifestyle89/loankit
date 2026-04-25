# Phase 02: Design Config & Hook

## Context
- [Phase 01 Audit](phase-01-audit-current-conditionals.md)
- Existing hooks: `src/lib/hooks/use-dropdown-options.ts`

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Create the central config file and React hook

## Architecture

### File Structure
```
src/lib/field-visibility/
  field-visibility-config.ts    # Central config (~80 LOC)
  use-field-visibility.ts       # React hook (~40 LOC)
  field-visibility-types.ts     # Type definitions (~30 LOC)
```

### Type Definitions (`field-visibility-types.ts`)

```typescript
/** Condition: all key-value pairs must match (AND logic) */
export type ShowWhenCondition = Record<string, string | string[]>;

export type FieldVisibilityRule = {
  /** Field is visible when ALL conditions match */
  show_when: ShowWhenCondition;
  /** Optional: human-readable description for self-documenting config */
  description?: string;
};

/** Group of fields sharing the same visibility rule */
export type FieldGroupRule = {
  fields: string[];
  show_when: ShowWhenCondition;
  description?: string;
};

export type FieldVisibilityConfig = {
  /** Individual field rules (field_key -> rule) */
  fields: Record<string, FieldVisibilityRule>;
  /** Named groups of fields sharing the same rule */
  groups: Record<string, FieldGroupRule>;
};
```

### Config File (`field-visibility-config.ts`)

```typescript
import type { FieldVisibilityConfig } from "./field-visibility-types";

export const FIELD_VISIBILITY_CONFIG: FieldVisibilityConfig = {
  groups: {
    // ── Customer: Corporate-only fields ──
    "customer.corporate_fields": {
      description: "Fields shown only for corporate customers (KHDN)",
      show_when: { customer_type: "corporate" },
      fields: [
        "main_business",
        "charter_capital",
        "legal_representative_name",
        "legal_representative_title",
        "organization_type",
      ],
    },
    // ── Customer: Individual-only fields ──
    "customer.individual_fields": {
      description: "Fields shown only for individual customers (KHCN)",
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
    // ── Customer: Individual-only actions ──
    "customer.scan_button": {
      description: "Document scanner button (KHCN only)",
      show_when: { customer_type: "individual" },
    },
  },
};
```

### Hook (`use-field-visibility.ts`)

```typescript
import { useMemo } from "react";
import { FIELD_VISIBILITY_CONFIG } from "./field-visibility-config";
import type { ShowWhenCondition } from "./field-visibility-types";

/** Check if all conditions match against form data */
function matchesCondition(
  condition: ShowWhenCondition,
  formData: Record<string, unknown>
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
 * Check if a single field should be visible.
 * Checks both direct field rules and group membership.
 * Returns true if no rule exists (default visible).
 */
export function isFieldVisible(
  fieldKey: string,
  formData: Record<string, unknown>
): boolean {
  const config = FIELD_VISIBILITY_CONFIG;

  // Check direct field rule
  const directRule = config.fields[fieldKey];
  if (directRule) {
    return matchesCondition(directRule.show_when, formData);
  }

  // Check group membership (strip prefix for matching)
  const bareKey = fieldKey.includes(".") ? fieldKey.split(".").pop()! : fieldKey;
  for (const group of Object.values(config.groups)) {
    if (group.fields.includes(bareKey)) {
      return matchesCondition(group.show_when, formData);
    }
  }

  // No rule = always visible
  return true;
}

/**
 * React hook: returns visibility checker bound to current form data.
 * Usage: const isVisible = useFieldVisibility(formData);
 *        {isVisible("cccd") && <Field ... />}
 */
export function useFieldVisibility(formData: Record<string, unknown>) {
  return useMemo(() => {
    return (fieldKey: string) => isFieldVisible(fieldKey, formData);
  }, [formData]);
}

/**
 * Check if an entire group is visible.
 * Usage: const showGroup = useGroupVisibility("customer.corporate_fields", formData);
 */
export function useGroupVisibility(
  groupKey: string,
  formData: Record<string, unknown>
): boolean {
  return useMemo(() => {
    const group = FIELD_VISIBILITY_CONFIG.groups[groupKey];
    if (!group) return true;
    return matchesCondition(group.show_when, formData);
  }, [groupKey, formData]);
}
```

## Design Decisions

1. **Groups over individual rules** -- Most conditionals are blocks of 5-10 fields sharing same condition. Groups reduce config size and match the JSX structure (`{showCorporate && <> ... </>}`)
2. **`string[]` in conditions** -- Supports `show_when: { status: ["active", "pending"] }` for OR within a single key. AND across keys.
3. **Pure function `isFieldVisible` exported** -- Can be used outside React (e.g., in submit payload filtering)
4. **`useMemo` on formData** -- Recalculates only when form data changes
5. **Bare key matching in groups** -- `"cccd"` matches whether caller passes `"cccd"` or `"customer.cccd"`

## Related Code Files
- **Create:** `src/lib/field-visibility/field-visibility-types.ts`
- **Create:** `src/lib/field-visibility/field-visibility-config.ts`
- **Create:** `src/lib/field-visibility/use-field-visibility.ts`

## Todo
- [ ] Create `src/lib/field-visibility/` directory
- [ ] Create `field-visibility-types.ts` with type definitions
- [ ] Create `field-visibility-config.ts` with all customer field rules
- [ ] Create `use-field-visibility.ts` with hook + pure function
- [ ] Verify TypeScript compiles without errors

## Success Criteria
- All 3 files created, under 200 LOC each
- Types are strict and self-documenting
- `isFieldVisible("cccd", { customer_type: "individual" })` returns `true`
- `isFieldVisible("cccd", { customer_type: "corporate" })` returns `false`
- `isFieldVisible("unknown_field", {})` returns `true` (no rule = visible)

## Risk Assessment
- **Low risk:** Pure utility code, no side effects
- Potential issue: bareKey matching could collide if two groups have same field name -> mitigate by using full dotted keys if needed
