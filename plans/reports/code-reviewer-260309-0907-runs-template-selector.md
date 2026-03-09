# Code Review: Runs Page - Template Selector & UX Improvements

**File:** `src/app/report/runs/page.tsx` (382 lines)
**Commit:** a861fd6

---

## Scope

- Template selector dropdown with API load
- `template_path` passed to export endpoint
- "Reopen in OnlyOffice" button via `previewClosed` state
- Per-output download buttons in run logs
- OnlyOffice modal close behavior change

---

## Overall Assessment

Solid feature additions. State management is correct, security is covered by server-side `safePath` validation. Several medium-priority issues around edge cases, file size, and hardcoded strings.

---

## Critical Issues

None.

---

## High Priority

### H1. File exceeds 200-line limit (382 lines)

Per project rules, files should stay under 200 lines. This page has grown significantly. Consider extracting:
- `TemplateSelector` component (~20 lines)
- `RunLogItem` component (~30 lines with download buttons)
- `ActionToolbar` component (~40 lines)
- `flushZustandDraft()` to a shared util (already used concept elsewhere)

### H2. No error handling on `loadRuns` and `loadFreshness` fetch failures

`loadRuns` (line 94) and `loadFreshness` (line 118) call `res.json()` without checking `res.ok` first. If the server returns a non-JSON error (e.g., 502), `res.json()` will throw an unhandled exception.

```tsx
// loadRuns - line 94
const res = await fetch("/api/report/runs", { cache: "no-store" });
if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return; }
const data = (await res.json()) as RunsResponse;
```

Same pattern needed for `loadFreshness`.

### H3. Export proceeds without template if templates loaded but none selected

If `selectedTemplateId` is `""` (empty string) and `templates.find()` returns `undefined`, no `template_path` is sent. The server may fall back to a default template or fail. This should either:
- Disable the export button when `selectedTemplateId` is empty but templates exist
- OR send explicit feedback to user

---

## Medium Priority

### M1. `previewClosed` state not reset when starting a new export

When user exports again after closing the modal, `setPreviewClosed(false)` is correctly called at line 197. This is fine.

However, if `onlyOfficePreviewPath` changes to a new path while `previewClosed` is `true`, the modal reopens with the new path -- correct behavior. No issue here upon closer inspection.

### M2. Hardcoded Vietnamese strings

Lines 200-201, 206, 290, 298, 306, 315, 320 contain hardcoded Vietnamese. These bypass the `useLanguage()` i18n system. Should use `t()` keys for consistency.

### M3. No loading state for template fetch

If templates load slowly, user sees no selector and might export without knowing templates are available. Consider showing a skeleton/placeholder.

### M4. `template_name` displayed without sanitization in `<option>`

Line 275: `{tp.template_name}` rendered inside `<option>`. In React, this is safe (React escapes by default). No XSS risk.

### M5. Download button click handler is inline async

Lines 362-366: Inline `async () => {}` in `onClick` for each output path button. Error handling is minimal (just `setError`). The error message is in English ("Failed to download file.") while rest of UI is Vietnamese.

---

## Low Priority

### L1. `setTimeout(0)` pattern in useEffect

Line 127-132: The `setTimeout(0, ...)` pattern persists. Purpose unclear (possibly avoiding SSR hydration mismatch). Would benefit from a comment explaining why.

### L2. `RotateCcw` icon semantics

`RotateCcw` (rotate counter-clockwise) is used for "reopen." A `MonitorPlay` or `ExternalLink` icon might better convey the action.

---

## Edge Cases Found

1. **Template deleted between load and export**: If a template is deleted server-side after `loadTemplates()` runs, the `docx_path` sent to export will reference a missing file. Server should return a clear error; client should handle gracefully. Currently, the generic error handler at line 205-206 catches this, but the message won't explain "template not found."

2. **Empty templates list**: If API returns `ok: true` but `templates: []`, the selector is hidden (line 262 `templates.length > 0`). Export proceeds without `template_path`. This is fine if server has a default fallback.

3. **Race condition on rapid re-export**: User clicks export, closes modal, clicks export again before first export completes. `runningExport` flag prevents double-click, so this is handled.

4. **`output_paths` with special characters**: `p.split("/").pop()` (line 372) is safe for display. `getSignedFileUrl` handles encoding.

---

## Positive Observations

- `safePath` + `validatePathUnderBase` on server prevents path traversal -- good security
- `previewClosed` pattern avoids destroying/recreating OnlyOffice editor state unnecessarily
- Template selector defaults to active template via `prev || data.active_template_id`
- Export body conditionally includes `template_path` only when a template is selected
- Download buttons in run logs are a good UX improvement over plain text spans

---

## Recommended Actions

1. **[High]** Extract components to bring file under 200 lines
2. **[High]** Add `res.ok` checks in `loadRuns` and `loadFreshness`
3. **[High]** Handle empty `selectedTemplateId` when templates exist (disable export or show warning)
4. **[Medium]** Replace hardcoded Vietnamese strings with i18n keys
5. **[Medium]** Add loading indicator for template fetch
6. **[Low]** Add comment explaining `setTimeout(0)` pattern

---

## Metrics

- Type Coverage: Good -- all states and API responses typed
- Linting Issues: Not checked (no lint run requested)
- File Size: 382 lines (exceeds 200-line limit)

---

## Unresolved Questions

1. What is the server behavior when `template_path` is omitted from export? Does it use a default template or fail?
2. Should the template selector be disabled during export to prevent changing selection mid-flight?
