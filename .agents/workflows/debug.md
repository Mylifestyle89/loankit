---
description: Debug issues systematically with root cause analysis before fixes
---

# /debug — Systematic Debugging Workflow

## Steps

1. **Gather the error**: Collect all available information:
   - Error message and stack trace
   - Steps to reproduce
   - Expected vs actual behavior
   - Check terminal output for errors
   - Check browser console if frontend issue

// turbo
2. **Read related files**: Based on the error, identify and read the relevant source files.

3. **Phase 1: Root Cause Investigation** (DO NOT SKIP)
   - Reproduce the issue
   - Read the error carefully — what file, what line, what message?
   - Trace backward through the call stack:
     - Where does the error originate?
     - What function called it?
     - What data was passed in?
   - Identify the root cause (not the symptom)

4. **Phase 2: Pattern Analysis**
   - Is this a one-off or recurring pattern?
   - Are there similar issues in the codebase?
   - What changed recently? (use `git log -5 --oneline`)

5. **Phase 3: Hypothesis & Fix**
   - Form a specific hypothesis about the cause
   - Implement the fix at the **source**, not the symptom
   - Add validation/guards to prevent recurrence

// turbo
6. **Phase 4: Verification** (MANDATORY)
   - Run `npm test` — all tests pass
   - Run `npm run build` — no compile errors
   - Test the original scenario — bug is fixed
   - Check for regressions

7. **Report**: Summarize:
   - 🐛 **Bug**: What was the issue
   - 🔍 **Root Cause**: Why it happened
   - 🔧 **Fix**: What was changed
   - ✅ **Verification**: Evidence it's fixed

## Red Flags — Stop and investigate if thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Should work now" / "Seems fixed"
