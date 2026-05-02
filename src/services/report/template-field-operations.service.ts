/**
 * Template field operations — re-exports from modular sub-files.
 * Kept as entry point so existing imports (template.service.ts etc.) are not broken.
 *
 * Sub-modules:
 *   - template-field-list.service.ts   — list/query operations
 *   - template-field-mutate.service.ts — create/update/attach operations
 */
export { listFieldTemplates } from "./template-field-list.service";
export { createFieldTemplate, updateFieldTemplate, attachTemplateToCustomer } from "./template-field-mutate.service";
