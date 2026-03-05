# Phase 03: Structured JSON Schemas on AI Calls

## Context Links
- [Phase 01](./phase-01-dry-cleanup-modularization.md) (prerequisite)
- [document-extraction.service.ts](../../src/services/document-extraction.service.ts)
- [OpenAI Structured Outputs docs](https://platform.openai.com/docs/guides/structured-outputs)

## Overview
- **Priority:** HIGH
- **Status:** completed
- **Effort:** 3h
- **Description:** Replace generic `json_object` mode with structured output schemas that enforce field_key names and value types at the API level. This prevents malformed keys, wrong types, and partial JSON.

## Key Insights
- OpenAI supports `response_format: { type: "json_schema", json_schema: {...} }` for structured outputs
- Gemini supports `responseSchema` in `generationConfig` for typed JSON output
- Currently using `response_format: { type: "json_object" }` (OpenAI) and `responseMimeType: "application/json"` (Gemini) -- these only guarantee valid JSON, not correct structure
- With structured schemas, AI returns exactly the field keys we expect -- no typos, no extra fields
- Batch size of 80 fields per call means schema needs to be dynamically generated per batch

## Requirements

### Functional
- Generate JSON schema from field catalog dynamically per API call
- OpenAI: use `json_schema` response format with property definitions
- Gemini: use `responseSchema` with type annotations
- Each field in schema: `{ type: "string" }` (all values as strings, validation in Phase 02)
- Schema should mark all fields as optional (AI may not find every field)

### Non-Functional
- Schema generation must be fast (<5ms for 80 fields)
- Backward compatible: if structured output fails, fall back to current `json_object` mode

## Architecture

### Schema Generation
```typescript
function buildJsonSchema(fields: FieldCatalogItem[]): object {
  return {
    name: "field_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: Object.fromEntries(
        fields.map(f => [f.field_key, { type: "string", description: f.label_vi }])
      ),
      required: [],  // all optional
      additionalProperties: false,
    }
  };
}
```

### Gemini Schema
```typescript
const responseSchema = {
  type: "object",
  properties: Object.fromEntries(
    fields.map(f => [f.field_key, { type: "string", description: f.label_vi }])
  ),
};
```

## Related Code Files
- **Modify:** `src/services/document-extraction.service.ts` -- update `extractViaOpenAI` and `extractViaGemini`
- **Create:** helper function in same file or `extraction-schema-builder.ts` if >50 lines

## Implementation Steps

1. **Create `buildOpenAIJsonSchema(fields)`** function -- generates `json_schema` format
2. **Create `buildGeminiResponseSchema(fields)`** function -- generates Gemini `responseSchema`
3. **Update `extractViaOpenAI`**: replace `response_format: { type: "json_object" }` with `response_format: { type: "json_schema", json_schema: buildOpenAIJsonSchema(fields) }`
4. **Update `extractViaGemini`**: add `responseSchema: buildGeminiResponseSchema(fields)` to `generationConfig`
5. **Add fallback**: if structured output throws (e.g., schema too large), retry with current `json_object` mode
6. **Update prompt**: remove instruction about JSON key format (schema enforces it now)
7. **Test with real documents**: verify extraction still works with both providers
8. **Run build + tests**

## Todo List
- [ ] Create buildOpenAIJsonSchema function
- [ ] Create buildGeminiResponseSchema function
- [ ] Update extractViaOpenAI with structured schema
- [ ] Update extractViaGemini with structured schema
- [ ] Add fallback to json_object mode
- [ ] Simplify prompt (remove JSON formatting instructions)
- [ ] Test with both providers
- [ ] Run build + tests

## Success Criteria
- AI responses contain only valid field_key names (no typos like "field_ky" or extra fields)
- `sanitizeExtractions` filtering reduces (fewer invalid keys to filter out)
- Fallback to `json_object` mode works when structured output not supported
- No increase in API latency

## Risk Assessment
- **Risk:** OpenAI `json_schema` with `strict: true` requires all properties defined -- large schemas may hit limits
- **Mitigation:** Already batching at 80 fields; 80 string properties is well within limits
- **Risk:** Gemini `responseSchema` syntax differs across API versions
- **Mitigation:** Test with current `v1` API; document version requirement
- **Risk:** `strict: true` may cause AI to return empty strings instead of omitting fields
- **Mitigation:** `sanitizeExtractions` already filters empty/null values

## Security Considerations
- No new security surface
- Schema prevents AI from injecting unexpected keys into response
