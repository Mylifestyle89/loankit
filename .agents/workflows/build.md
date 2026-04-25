---
description: Build the project and check for compile errors
---

# /build — Build & Compile Check Workflow

## Steps

// turbo
1. **Run the build**:
   ```bash
   npm run build
   ```

2. **Analyze output**:
   - If build succeeds → report success ✅
   - If build fails → for each error:
     - Read the error message and file location
     - Open the file and find the exact line
     - Identify the cause (type error, missing import, syntax error, etc.)
     - Fix the error

3. **If fixes were made**:
   // turbo
   - Re-run `npm run build` to verify
   - Repeat until build succeeds

4. **Report**:
   - Build status: ✅ Success or ❌ Failed
   - Errors found: count and descriptions
   - Fixes applied: list of changes
   - Build time: how long it took
