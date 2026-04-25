# Efficiency Review: DOCX Customer Import Feature

**Date:** 2026-04-06  
**Scope:** `src/app/api/customers/import-docx/route.ts` (233 lines) + `src/components/customers/customer-docx-import-modal.tsx` (371 lines)  
**Focus:** Performance bottlenecks, N+1 patterns, parallelization opportunities, memory usage

---

## Critical Issues (HIGH)

### 1. **Sequential File Processing in Route Handler (lines 202-212)**

**Issue:** Files are processed one-by-one in a loop. Each file extraction waits for the previous one to finish.

```typescript
// SLOW: Sequential
for (const file of files) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const paragraphs = await extractParagraphs(buffer);
  const documentText = paragraphs.map((p) => p.text).join("\n");
  if (!documentText.trim()) continue;
  const extracted = await extractWithGemini(documentText);  // Awaits here
  results.push(extracted);
}
```

**Impact:** For 5 DOCX files, if each takes ~5-10 seconds (Gemini API call), total time = 25-50 seconds. With parallelization: 5-10 seconds.

**Severity:** HIGH — User UX degradation on multi-file imports.

**Fix:**
```typescript
// FAST: Parallel extraction
const extractionPromises = files.map(async (file) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const paragraphs = await extractParagraphs(buffer);
  const documentText = paragraphs.map((p) => p.text).join("\n");
  if (!documentText.trim()) return null;
  return extractWithGemini(documentText);
});

const results = (await Promise.all(extractionPromises)).filter((r) => r !== null);
```

---

### 2. **Full Customer List Fetch for Single CCCD Duplicate Check (modal.tsx, lines 107-114)**

**Issue:** Modal fetches ALL customers (`/api/customers?type=individual`) just to check if one CCCD exists. With 1000+ customers, this loads massive payload.

```typescript
const checkRes = await fetch(`/api/customers?type=individual`);
const checkData = await checkRes.json();
if (checkData.ok) {
  const dup = checkData.customers?.find((c) => c.cccd === cccd);
  if (dup) setDuplicateWarning(...)
}
```

**Impact:**
- Unnecessary network transfer (potentially MBs of customer data)
- Memory spike in browser
- No pagination logic → request may hit timeout or memory limits

**Severity:** HIGH — Scalability risk; breaks at 1000+ customers.

**Fix:** Create a targeted endpoint `/api/customers/check-cccd?cccd=XXX`:
```typescript
const checkRes = await fetch(`/api/customers/check-cccd?cccd=${encodeURIComponent(cccd)}`);
```

**Route implementation (new file `src/app/api/customers/check-cccd/route.ts`):**
```typescript
export async function GET(req: NextRequest) {
  const cccd = req.nextUrl.searchParams.get("cccd");
  if (!cccd) return NextResponse.json({ ok: false }, { status: 400 });
  
  const customer = await prisma.customer.findFirst({
    where: { cccd },
    select: { id: true, customer_name: true, cccd: true },
  });
  
  return NextResponse.json({ ok: true, exists: !!customer, customer });
}
```

---

## High-Priority Issues (MED-HIGH)

### 3. **N+1 on Loan Creation (modal.tsx, lines 163-178)**

**Issue:** Creates loans sequentially with individual API calls. Each POST waits for previous one.

```typescript
for (const loan of extracted.loans) {
  if (!loan.contract_number && !loan.loan_amount) continue;
  await fetch("/api/loans", {  // Sequential await
    method: "POST",
    body: JSON.stringify({ customerId, ...loan })
  });
}
```

**Impact:** 5 loans = 5 sequential API calls (~5-10 sec vs ~1 sec parallel).

**Severity:** MED-HIGH — Noticeable delay but manageable.

**Fix:** Batch create or parallel requests:
```typescript
const loanPromises = extracted.loans
  .filter((l) => l.contract_number || l.loan_amount)
  .map((loan) =>
    fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, ...loan })
    })
  );
await Promise.all(loanPromises);
```

---

### 4. **N+1 on Collateral Creation (modal.tsx, lines 181-200)**

**Issue:** Same problem as loans — sequential collateral creation.

```typescript
for (const col of extracted.collaterals) {
  if (!col.name) continue;
  await fetch(`/api/customers/${customerId}/collaterals`, {  // Sequential
    method: "POST",
    body: JSON.stringify({ ...col })
  });
}
```

**Impact:** 5 collaterals = 5 sequential API calls.

**Severity:** MED-HIGH — Same as loans.

**Fix:** Parallel requests (same pattern as loans fix above).

---

## Medium Priority (MED)

### 5. **No Error Handling on Loan/Collateral Creation (modal.tsx, lines 163-200)**

**Issue:** If a loan or collateral creation fails, the whole import fails without partial success. Customer is created, but dependent data may fail silently.

```typescript
for (const loan of extracted.loans) {
  await fetch("/api/loans", { ... });
  // No error check! If fails, silent continue
}
```

**Fix:** Wrap each request with error handling and collect failures:
```typescript
const failedLoans: string[] = [];
for (const loan of extracted.loans) {
  try {
    const res = await fetch("/api/loans", { ... });
    if (!res.ok) failedLoans.push(loan.contract_number);
  } catch (err) {
    failedLoans.push(loan.contract_number);
  }
}
if (failedLoans.length > 0) {
  setError(`Failed to create loans: ${failedLoans.join(", ")}`);
}
```

---

### 6. **Large File Buffers in Memory (route.ts, lines 203-204)**

**Issue:** Each file converted to Buffer synchronously. For 5 DOCX files (~5-10 MB each), total memory = 25-50 MB simultaneous if parallelized without streaming.

```typescript
const buffer = Buffer.from(await file.arrayBuffer());
```

**Impact:** Not critical for small files, but could spike memory on large batches.

**Severity:** MED — Only affects large file sets; current MAX_FILES=5 is reasonable limit.

**Mitigation:** Keep sequential file-to-buffer conversion, but parallel Gemini extraction:
```typescript
const results: ExtractionResult[] = [];
for (const file of files) {
  const buffer = Buffer.from(await file.arrayBuffer()); // Sequential
  const documentText = await extractParagraphs(buffer).then(...);
  results.push({ promise: extractWithGemini(documentText), source: file.name });
}
// Wait for all Gemini calls in parallel
const resolved = await Promise.all(results.map(r => r.promise));
```

---

### 7. **Duplicate Check Timing (modal.tsx, lines 104-115)**

**Issue:** Duplicate check happens AFTER AI extraction succeeds, adding latency after user already waited. Better to check BEFORE extraction if possible (though CCCD may not be known).

**Current flow:**
1. User uploads files
2. Extract (5-10 sec)
3. Check CCCD (1+ sec)
4. Show review

**Better flow:** Could optimize by doing quick CCCD existence check first IF cccd visible in first page, but requires file parsing preview. Not worth for this feature yet.

**Severity:** LOW — Acceptable UX.

---

## Low Priority (LOW)

### 8. **Truncation Logic May Lose Context (route.ts, lines 98-101)**

**Issue:** Large documents truncated to 30K + 10K tail. Middle section loss could cause missed data.

```typescript
if (text.length <= 40_000) return text;
return `${text.slice(0, 30_000)}\n\n...(rút gọn)...\n\n${text.slice(-10_000)}`;
```

**Impact:** Loans/collaterals in middle sections may be missed.

**Severity:** LOW — Gemini will still extract what's visible; rare edge case. If critical, increase truncation limit (check API token budget).

---

## Memory Observations (Positive)

- ✅ File filter check (line 189-195) prevents oversized uploads
- ✅ MAX_FILES = 5 is reasonable concurrent limit
- ✅ `mergeResults()` logic correctly deduplicates across files
- ✅ No memory leaks in modal state management

---

## Recommendations (Priority Order)

1. **IMMEDIATE:** Parallelize file extraction in route.ts (Issue #1) — 5-10x latency improvement
2. **IMMEDIATE:** Replace full-list CCCD fetch with targeted API (Issue #2) — scalability blocker
3. **HIGH:** Parallelize loan/collateral creation (Issues #3, #4) — noticeable UX improvement
4. **HIGH:** Add error handling on loan/collateral creation (Issue #5) — data integrity
5. **MED:** Optimize file buffer memory if testing shows spike (Issue #6) — rare, monitor first

---

## Metrics

- **File Processing:** Currently O(n) sequential → O(1) parallel for Gemini calls
- **Duplicate Check:** Currently O(n) full scan → O(log n) indexed lookup
- **Total Import Time (5 files):** ~30-50 sec → ~8-15 sec (target)
- **Network Efficiency:** ~5-10 API calls → 3-4 (customer + loan batch + collateral batch)

---

## Unresolved Questions

1. What is typical max file size in production? (Affects buffer strategy)
2. Does `/api/loans` support batch creation? If yes, use batch endpoint instead of parallel individual calls.
3. Is CCCD uniqueness enforced in DB schema? If not, modal warning is advisory only — that's fine.
