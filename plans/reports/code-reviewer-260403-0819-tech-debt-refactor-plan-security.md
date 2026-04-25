# Security Adversary Review: Full Codebase Tech Debt Refactor Plan

**Date:** 2026-04-03
**Plan:** `plans/260403-0759-full-tech-debt-refactor/`
**Perspective:** Attacker mindset — auth bypass, injection, data exposure, privilege escalation, supply chain

---

## Finding 1: API Key Centralization Creates Single-Point Exfiltration Target

- **Severity:** Critical
- **Location:** Phase 0A, "Target State" — `resolveAiProvider()` returns `{ provider: string; apiKey: string }`
- **Flaw:** The plan designs `resolveAiProvider()` to return the raw API key as a string in its return value. Currently keys are read and used within the same private function scope in each service. After this refactor, the key travels through a shared public function return, making it trivially interceptable by any code that imports from `@/lib/ai`. Any future module with access to the barrel can call `resolveAiProvider()` and exfiltrate both provider name and secret key.
- **Failure scenario:** A developer (or compromised dependency) adds `console.log(resolveAiProvider())` or sends the result to an analytics endpoint. The key leaks to stdout/logs/third-party. Current architecture limits blast radius because each service reads its own env var locally.
- **Evidence:** Phase 0A spec: `export function resolveAiProvider(): { provider: string; apiKey: string }` — exported, public, returns plaintext key.
- **Suggested fix:** `resolveAiProvider()` should NOT return the key. Return only `{ provider: "openai" | "gemini" }` and let each service read the key from env directly, or provide a factory that returns a configured client instance (never the raw key). Alternatively, mark the module as server-only (`import "server-only"`) and never export the key.

## Finding 2: Phase 7 Bulk sed on Import Paths — Injection via Filenames

- **Severity:** High
- **Location:** Phase 7, "Execution Strategy" — `grep -rl "from.*OldName" src/ | xargs sed -i 's|/OldName|/new-name|g'`
- **Flaw:** The sed substitution uses `|` as delimiter but performs unanchored, greedy replacement across entire file content. If any file contains a string like `/OldName` in a comment, URL, or string literal (not an import path), it will be silently corrupted. Worse, if a filename contains shell metacharacters or spaces (Vietnamese filenames exist in this repo — see git status), `xargs` will break or execute unintended commands.
- **Failure scenario:** A string constant `"/api/v1/FinancialAnalysisModal/config"` becomes `"/api/v1/financial-analysis-modal/config"`, silently breaking an API endpoint. Or a file path with Vietnamese diacritics causes xargs to split incorrectly, corrupting unrelated files.
- **Evidence:** Plan line: `grep -rl "from.*OldName" src/ | xargs sed -i 's|/OldName|/new-name|g'`. The repo has Vietnamese-named files (see git status: `report_assets/KHCN templates/...`).
- **Suggested fix:** Use a proper AST-based import rewriter (e.g., `jscodeshift` or TypeScript compiler API). At minimum, anchor the sed pattern to import/require statements only: `s|from ["']([^"']*)/OldName["']|...|` and use `xargs -d '\n'` or `find -print0 | xargs -0`.

## Finding 3: extractJsonObject Consolidation Drops Type Narrowing in 2 of 3 Callers

- **Severity:** High
- **Location:** Phase 0B, "Target State"
- **Flaw:** The plan picks the financial-analysis version (returns `Record<string, string>` with type check) as canonical, but `ai-mapping.service.ts` (line 57) and `auto-tagging-ai-helpers.ts` (line 56) both return `unknown` and rely on separate downstream sanitization functions (`sanitizeSuggestion`, `sanitizeSuggestions`) that expect untyped input. Forcing `Record<string, string>` return type will either (a) silently cast non-string values to strings, or (b) throw on valid AI responses that contain nested objects (e.g., `{ tags: [...] }` from auto-tagging).
- **Failure scenario:** Auto-tagging AI returns `{ tags: [{ index: 1, ... }] }`. The "robust" version's type check (`!Array.isArray(parsed)`) passes, but the cast to `Record<string, string>` silently drops array values. Downstream `sanitizeSuggestions` receives `undefined` for `tags`, returns empty array — tagging silently stops working with no error.
- **Evidence:** `ai-mapping.service.ts:57` returns `unknown`; `auto-tagging-ai-helpers.ts:56` returns `unknown`. The financial-analysis version at line 163 does `return parsed as Record<string, string>` — unsafe cast.
- **Suggested fix:** The shared function should return `unknown` (the lowest common denominator). Each caller applies its own type narrowing/validation. The 3-step fallback extraction logic is reusable; the return type is not.

## Finding 4: Phase 0A/0B Write to Same `src/lib/ai/index.ts` Barrel — Race Condition in Parallel Execution

- **Severity:** High
- **Location:** plan.md, "Execution Strategy" — Phase 0A and 0B run in parallel, both modify `src/lib/ai/index.ts`
- **Flaw:** Both Phase 0A (creates `index.ts` barrel) and Phase 0B (updates `index.ts` barrel) target the same file concurrently. If agents run in parallel, last-write-wins will drop one phase's exports.
- **Failure scenario:** Phase 0A creates `src/lib/ai/index.ts` with `export { resolveAiProvider }`. Phase 0B opens the same file (possibly cached before 0A wrote it), writes `export { extractJsonFromAiResponse }`. Phase 0A's export disappears. `npx tsc --noEmit` fails, but the root cause is non-obvious and wastes debugging time.
- **Evidence:** Phase 0A: "CREATE: `src/lib/ai/index.ts`". Phase 0B: "MODIFY: `src/lib/ai/index.ts`". Plan says "Phase 0A-0C: parallel DRY dedup, run FIRST".
- **Suggested fix:** Either (1) make 0A run first (it creates the barrel), then 0B/0C in parallel, or (2) remove the barrel entirely — direct imports from specific files are safer and avoid the shared file conflict.

## Finding 5: No Rollback Strategy for 102-File Refactor

- **Severity:** High
- **Location:** plan.md, entire plan — no mention of branching, rollback, or incremental merge
- **Flaw:** The plan touches 102+ files across 10 phases with `branch: main` specified. There is no mention of feature branches, incremental PRs, or rollback strategy. If Phase 4 introduces a subtle runtime regression (e.g., FinancialAnalysisModal prop mismatch), reverting requires cherry-picking across 10 phases of interleaved changes.
- **Failure scenario:** Phase 0C merges FinancialAnalysisModal incorrectly. Phase 1 and 4 build on top of it. Phase 7 renames everything. A bug is discovered in production. `git revert` is impossible because Phase 7 renamed every file that Phase 0C touched. Full manual revert needed.
- **Evidence:** plan.md frontmatter: `branch: main`. No mention of feature branch, PR strategy, or rollback plan anywhere in 10 phase files.
- **Suggested fix:** Work on a feature branch. Each phase should be a separate commit (or PR). Phase 7 rename should be its own PR, reviewed and merged last. This makes `git bisect` and `git revert` viable.

## Finding 6: Phase 0C — Dynamic Import of framer-motion Without Integrity Check

- **Severity:** Medium
- **Location:** Phase 0C, step 3 — "Conditionally import framer-motion (dynamic import to avoid bundle bloat)"
- **Flaw:** The plan calls for dynamic/conditional import of `framer-motion` but doesn't specify how. If implemented as `await import("framer-motion")` in a component, this bypasses Next.js tree-shaking and Subresource Integrity checks. More importantly, if an attacker compromises the `framer-motion` npm package (supply chain attack), the dynamic import means the malicious code only loads on specific code paths (khdn with `animated: true`), making detection harder.
- **Failure scenario:** Supply chain attack on framer-motion. Static imports would be caught by `npm audit` and bundler analysis. Dynamic imports load at runtime, potentially after security scans pass on the static bundle.
- **Evidence:** Phase 0C step 3: "Conditionally import framer-motion (dynamic import to avoid bundle bloat)". No mention of `next/dynamic`, lazy boundaries, or lockfile integrity verification.
- **Suggested fix:** Use `next/dynamic` with `ssr: false` for the animated variant, not raw `import()`. Pin framer-motion version in package-lock.json and run `npm audit` as part of verification. Consider whether the bundle size saving is worth the complexity — framer-motion is likely already in the bundle if khdn uses it.

## Finding 7: Service Split Exposes Internal Functions as Module-Public

- **Severity:** Medium
- **Location:** Phase 3, all service splits
- **Flaw:** Splitting `ai-mapping.service.ts` into `ai-mapping-helpers.ts` creates a new file that exports `tokenize`, `jaccardSimilarity`, `safeParseJson`, `validateMapping`, `fuzzyMatch`. Currently these are private functions within the service file. After the split, they become importable by any file in the project. Functions like `safeParseJson` and `fuzzyMatch` without proper input validation become attack surface when called from unexpected contexts.
- **Failure scenario:** A future developer imports `safeParseJson` from `ai-mapping-helpers` in an API route handler to parse user input, bypassing the sanitization that the original service applied after JSON extraction. Prototype pollution or injection via crafted JSON payload.
- **Evidence:** Phase 3 split: `ai-mapping-helpers.ts` — "tokenize, jaccardSimilarity, safeParseJson, validateMapping, validateGrouping, fuzzyMatch (~100 lines)". These were previously `function` (not `export function`) in the monolithic file.
- **Suggested fix:** Only export what the parent service barrel needs. Use `/** @internal */` JSDoc annotations. Better yet, don't export helpers at all — re-export only through the service barrel, and document that `ai-mapping-helpers` is an internal module.

## Finding 8: Phase 5 Extracts Types to Shared Files Without Access Control Consideration

- **Severity:** Medium
- **Location:** Phase 5, invoices/page.tsx split — "invoice-overview-types.ts"
- **Flaw:** Extracting types like `Invoice`, `GroupedDisbursement` into standalone type files makes them importable across the entire frontend. If these types include sensitive fields (e.g., `customerPhone`, `totalDebt`, `overdueAmount`), other components can now import and render them without going through the page's access-control checks (if any exist). The plan doesn't audit whether these types contain PII fields.
- **Failure scenario:** `invoice-overview-types.ts` exports `Invoice` type with `customerPhone: string`. A developer imports this type in a public-facing component, assumes the type implies the data is safe to display, and renders PII without checking user permissions.
- **Evidence:** Phase 5: "invoice-overview-types.ts — SummaryItem, Invoice, GroupedDisbursement types (~50 lines)". Project memory notes: "PII phai encrypt trong DB (AES-256-GCM) vi Agribank security scan quet plaintext".
- **Suggested fix:** Types alone don't expose data, but they create affordances. Add `/** @internal - contains PII fields, do not use in client-facing components without auth check */` comments. Or keep types co-located with the page file (inline) rather than extracting them.

## Finding 9: Verification Strategy Insufficient — tsc --noEmit Catches Types, Not Runtime Behavior

- **Severity:** Medium
- **Location:** plan.md, "Verification" — "Each phase ends with: `npx tsc --noEmit`"
- **Flaw:** `tsc --noEmit` only catches TypeScript compilation errors. It does NOT catch: (1) runtime import resolution failures from incorrect barrel re-exports, (2) behavioral regressions from the FinancialAnalysisModal merge (Phase 0C), (3) missing exports that are only consumed via `require()` or dynamic imports, (4) CSS/styling changes from component restructuring. The plan has zero runtime verification until the final `npx next build` at Phase 7.
- **Failure scenario:** Phase 0C merges the modal. `tsc --noEmit` passes. The khdn variant now shows no animation because the `animated` prop defaults to `false` and the call site wasn't updated. This is a silent behavioral regression that compiles fine. Nobody notices until production.
- **Evidence:** Phase 0C todo includes "Manual test both usage paths" but this is only in Phase 0C. Phases 1-6 have NO manual or runtime testing steps — only `npx tsc --noEmit`. Phase 0C Risk section: "Test manually: both khdn and non-khdn usage paths" but no specific test cases defined.
- **Suggested fix:** Add `npx next build` after each DRY phase (0A-0C) since these change runtime behavior. Add explicit smoke test checklist for Phase 0C (open modal in khdn context, verify animation, verify step dots, verify embedded mode). Consider adding `npx next dev` + Playwright smoke tests if available.

---

## Summary

| # | Severity | Finding |
|---|----------|---------|
| 1 | Critical | API key exposed via public resolver return value |
| 2 | High | Blind sed/xargs import rewriting — corruption + shell injection risk |
| 3 | High | Type mismatch in JSON extractor consolidation — silent data loss |
| 4 | High | Parallel phases race on shared barrel file |
| 5 | High | No branching/rollback strategy for 102-file refactor on main |
| 6 | Medium | Dynamic framer-motion import without integrity/bundler controls |
| 7 | Medium | Private helper functions become module-public after split |
| 8 | Medium | PII-bearing types extracted to importable shared files |
| 9 | Medium | Type-only verification misses runtime/behavioral regressions |

**Bottom line:** The plan has one critical flaw (Finding 1) that must be redesigned before implementation. Findings 2-5 are high-severity and will cause real problems during execution. The plan treats this as a "zero risk" structural refactor but fails to account for security surface expansion, data type mismatches, and execution-order hazards.
