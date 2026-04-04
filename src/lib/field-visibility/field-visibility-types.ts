/** Condition: all key-value pairs must match (AND logic) */
export type ShowWhenCondition = Record<string, string | string[]>;

export type FieldVisibilityRule = {
  /** Field visible when ALL conditions match */
  show_when: ShowWhenCondition;
  /** Human-readable description for self-documenting config */
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
