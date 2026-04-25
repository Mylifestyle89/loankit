---
description: Run tests and analyze results
---

# /test — Testing Workflow

## Steps

// turbo
1. **Run all tests**:
   ```bash
   npm test
   ```

2. **Analyze results**:
   - If all tests pass → report success ✅
   - If tests fail → for each failure:
     - Read the test file to understand what's being tested
     - Read the source file to understand the implementation
     - Identify why the test is failing
     - Suggest or implement fix

3. **If fixes were made**:
   // turbo
   - Re-run `npm test` to verify all tests pass
   - Repeat until 100% pass rate

4. **Coverage check** (optional — if user requests):
   ```bash
   npm run test:coverage
   ```
   - Report coverage percentage
   - Identify uncovered critical paths

5. **Report**:
   - Total tests: X passed / Y total
   - Failed tests: list with reasons
   - Fixes applied: list of changes made
   - Coverage: percentage (if requested)

## Rules
- **DO NOT** use fake data, mocks, cheats, or tricks just to pass tests
- **DO NOT** ignore failing tests to pass the build
- Always fix failing tests by fixing the source code or updating test expectations
- Report honestly — if a test can't be fixed, explain why
