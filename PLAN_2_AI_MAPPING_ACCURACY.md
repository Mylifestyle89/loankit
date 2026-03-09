# 🚀 PLAN 2: CẢI THIỆN ĐỘ CHÍNH XÁC AI MAPPING (30-40% → 70-85%)

## 🎯 Mục Tiêu Chung
Từ accuracy 30-40% → 70-85% bằng cách:
1. Cải thiện Field Hints (metadata đầy đủ)
2. Implement multi-stage matching (Exact → Fuzzy → Semantic)
3. Xây dựng learning system (cache successful mappings)

---

## 📌 ROOT CAUSE ANALYSIS

### Vấn đề 1: Field Hints Không Đầy Đủ (60% impact)
**Hiện tại:**
```typescript
fieldHints: [{
  key: "doanh_thu",
  label: "Doanh thu",  // ← Quá chung chung
  type: "number"
}]
```

**Cần:**
```typescript
fieldHints: [{
  key: "doanh_thu",
  label: "Doanh thu bán hàng",
  description: "Tổng doanh thu từ bán hàng sản phẩm/dịch vụ chính",
  type: "currency",
  examples: ["1500000", "2300000"],
  aliases: ["revenue", "doanh số", "bán hàng"],
  domain: "finance"
}]
```

### Vấn đề 2: AI Prompt Yếu (20% impact)
Prompt hiện tại chưa leverage domain knowledge, synonyms, abbreviations

### Vấn đề 3: Không Multi-stage Matching (15% impact)
Chỉ dùng AI, không có fallback, không có caching

### Vấn đề 4: No Learning Loop (5% impact)
Mỗi lần map từ đầu, không reuse successful mappings

---

## 🔨 PHASE 1: CẢI THIỆN FIELD HINTS (1.5 ngày)

### 1.1. Extend FieldCatalogItem Schema

**File:** `src/lib/report/config-schema.ts`

```typescript
export const fieldCatalogItemSchema = z.object({
  field_key: z.string().min(1),
  label_vi: z.string().min(1),
  description: z.string().optional(),  // ← NEW
  group: z.string().min(1),
  type: z.enum(["text", "number", "percent", "date", "table", "currency"]),
  required: z.boolean().default(false),
  is_repeater: z.boolean().optional(),
  normalizer: z.string().optional(),
  examples: z.array(z.string()).default([]),
  aliases: z.array(z.string()).optional(),  // ← NEW
  domain: z.enum(["finance", "hr", "warehouse", "general"]).optional(),  // ← NEW
  analysis_prompt: z.string().optional(),
});
```

**Tasks:**
- [ ] Update schema with description, aliases, domain
- [ ] Update all Field Catalog items
- [ ] Migrate existing data

### 1.2. Enrich Field Catalog with Metadata

**Ví dụ cho Finance Domain:**

```typescript
{
  field_key: "revenue_net",
  label_vi: "Doanh thu thuần",
  description: "Doanh thu bán hàng sau khi trừ chiết khấu và các khoản giảm trừ",
  group: "Kết quả hoạt động",
  type: "currency",
  examples: ["15000000", "22500000", "18750000"],
  aliases: ["doanh thu", "revenue", "sales", "doanh số", "DT thuần"],
  domain: "finance",
  analysis_prompt: "Phân tích xu hướng doanh thu..."
}
```

**Tasks cho từng domain:**

**Finance (30 fields):**
- [ ] revenue_net, cost_of_goods, gross_profit
- [ ] operating_profit, interest_expense, tax_expense
- [ ] total_assets, current_assets, fixed_assets
- [ ] total_liabilities, current_liabilities, long_term_liabilities
- [ ] equity, retained_earnings
- [ ] current_ratio, debt_to_equity, roe, roa
- [ ] ... (30 total)

**HR (20 fields):**
- [ ] employee_id, employee_name, department
- [ ] salary, bonus, allowance, gross_pay
- [ ] tax_withheld, net_pay
- [ ] ... (20 total)

**Warehouse (25 fields):**
- [ ] sku, product_name, quantity_on_hand
- [ ] reorder_point, warehouse_location
- [ ] ... (25 total)

**Process:**
1. Định nghĩa 5-10 aliases cho mỗi field
2. Thêm 3-5 real examples
3. Viết description chi tiết (2-3 câu)
4. Gắn domain tag

---

## 🎨 PHASE 2: MULTI-STAGE MATCHING ENGINE (2 ngày)

### 2.1. Tạo Advanced Matching Service

**File:** `src/lib/report/advanced-field-matcher.ts`

```typescript
export interface MatchStage {
  name: string;
  score: number;  // 0-100
  matchedHeader?: string;
  confidence: "high" | "medium" | "low";
}

export interface MatchResult {
  placeholder: string;
  stages: MatchStage[];
  finalMatch: string | null;
  confidence: number;
}

export function advancedFieldMatch(
  placeholder: string,
  excelHeaders: string[],
  fieldHints?: FieldHint[],
  cachedMappings?: Record<string, string>
): MatchResult
```

### 2.2. Implement 4 Matching Stages

**Stage 1: Exact Match (100% confidence)**
```typescript
function stageExactMatch(placeholder: string, headers: string[]): MatchStage {
  const exact = headers.find(h => h.toLowerCase() === placeholder.toLowerCase());
  return {
    name: "Exact Match",
    score: exact ? 100 : 0,
    matchedHeader: exact,
    confidence: exact ? "high" : "low"
  };
}
```

**Stage 2: Fuzzy Match with Normalization**
```typescript
function stageFuzzyMatch(placeholder: string, headers: string[], hints?: FieldHint[]): MatchStage {
  const hints_aliases = hints?.aliases || [];
  let bestScore = 0;
  let bestHeader = "";

  for (const header of headers) {
    // So sánh placeholder với header
    const score1 = tokenOverlapScore(placeholder, header);
    // So sánh aliases với header
    const score2 = Math.max(...hints_aliases.map(a => tokenOverlapScore(a, header)));
    const finalScore = Math.max(score1, score2);

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestHeader = header;
    }
  }

  return {
    name: "Fuzzy Match",
    score: bestScore * 100,
    matchedHeader: bestScore > 0.5 ? bestHeader : undefined,
    confidence: bestScore > 0.7 ? "high" : bestScore > 0.5 ? "medium" : "low"
  };
}
```

**Stage 3: Semantic Match (Vietnamese synonyms + domain knowledge)**
```typescript
function stageSemanticMatch(
  placeholder: string,
  headers: string[],
  hints?: FieldHint[]
): MatchStage {
  // Dùng semantic similarity (simplistic version):
  // "doanh thu" ~ "revenue" ~ "sales" ~ "doanh số"

  const semanticMap = buildSemanticMap();  // Build from hints + domain
  const placeholderConcepts = extractConcepts(placeholder, semanticMap);

  let bestScore = 0;
  let bestHeader = "";

  for (const header of headers) {
    const headerConcepts = extractConcepts(header, semanticMap);
    const overlap = findCommonConcepts(placeholderConcepts, headerConcepts);
    const score = overlap.length / Math.max(placeholderConcepts.length, 1);

    if (score > bestScore) {
      bestScore = score;
      bestHeader = header;
    }
  }

  return {
    name: "Semantic Match",
    score: bestScore * 100,
    matchedHeader: bestScore > 0.6 ? bestHeader : undefined,
    confidence: bestScore > 0.8 ? "high" : bestScore > 0.6 ? "medium" : "low"
  };
}
```

**Stage 4: AI Suggestion (fallback)**
```typescript
async function stageAIMatch(
  placeholder: string,
  headers: string[],
  hints?: FieldHint[]
): Promise<MatchStage> {
  // Gọi AI (OpenAI/Gemini) chỉ khi stage 1-3 không thành công
  const aiResult = await suggestViaAI(placeholder, headers, hints);

  return {
    name: "AI Suggestion",
    score: 70,  // AI mặc định 70% confidence
    matchedHeader: aiResult,
    confidence: "medium"
  };
}
```

### 2.3. Orchestrate Matching Pipeline

```typescript
export async function matchFieldWithFallback(
  placeholder: string,
  excelHeaders: string[],
  fieldHints?: FieldHint[],
  cachedMappings?: Record<string, string>
): Promise<MatchResult> {
  const stages: MatchStage[] = [];

  // 1. Try cache first
  if (cachedMappings?.[placeholder]) {
    return {
      placeholder,
      stages: [{ name: "Cache Hit", score: 100, confidence: "high" }],
      finalMatch: cachedMappings[placeholder],
      confidence: 100
    };
  }

  // 2. Stage 1: Exact
  const stage1 = stageExactMatch(placeholder, excelHeaders);
  stages.push(stage1);
  if (stage1.matchedHeader) {
    return { placeholder, stages, finalMatch: stage1.matchedHeader, confidence: 100 };
  }

  // 3. Stage 2: Fuzzy
  const stage2 = stageFuzzyMatch(placeholder, excelHeaders, fieldHints);
  stages.push(stage2);
  if (stage2.score > 75 && stage2.matchedHeader) {
    return { placeholder, stages, finalMatch: stage2.matchedHeader, confidence: stage2.score };
  }

  // 4. Stage 3: Semantic
  const stage3 = stageSemanticMatch(placeholder, excelHeaders, fieldHints);
  stages.push(stage3);
  if (stage3.score > 70 && stage3.matchedHeader) {
    return { placeholder, stages, finalMatch: stage3.matchedHeader, confidence: stage3.score };
  }

  // 5. Stage 4: AI (chỉ khi cần)
  const stage4 = await stageAIMatch(placeholder, excelHeaders, fieldHints);
  stages.push(stage4);

  return {
    placeholder,
    stages,
    finalMatch: stage4.matchedHeader || null,
    confidence: stage4.score
  };
}
```

**Tasks:**
- [ ] Implement stageExactMatch
- [ ] Improve stageFuzzyMatch (handle Vietnamese better)
- [ ] Implement stageSemanticMatch
- [ ] Integrate stageAIMatch (use existing AI service)
- [ ] Orchestrate pipeline
- [ ] Add confidence scoring
- [ ] Unit test cho mỗi stage

---

## 💾 PHASE 3: LEARNING SYSTEM - CACHE SUCCESSFUL MAPPINGS (1 ngày)

### 3.1. Mapping Cache Schema

**File:** `src/lib/report/mapping-cache.ts`

```typescript
export interface CachedMapping {
  placeholder: string;
  excelHeader: string;
  domain: string;  // finance, hr, warehouse
  createdAt: string;
  successCount: number;  // Bao nhiêu lần mapping này thành công
  confidence: number;
}

export interface MappingCache {
  mappings: CachedMapping[];
  lastUpdated: string;
}
```

### 3.2. Implement Cache Operations

**Database/FileSystem Store:**
```typescript
// Lưu cache vào Supabase/Firebase hoặc local JSON
export async function saveMappingToCache(
  placeholder: string,
  excelHeader: string,
  domain: string
): Promise<void> {
  const cache = await loadMappingCache(domain);
  const existing = cache.mappings.find(m => m.placeholder === placeholder);

  if (existing) {
    existing.successCount += 1;
    existing.createdAt = new Date().toISOString();
  } else {
    cache.mappings.push({
      placeholder,
      excelHeader,
      domain,
      createdAt: new Date().toISOString(),
      successCount: 1,
      confidence: 100
    });
  }

  await persistMappingCache(domain, cache);
}

export async function getCachedMapping(
  placeholder: string,
  domain: string
): Promise<string | null> {
  const cache = await loadMappingCache(domain);
  return cache.mappings.find(m => m.placeholder === placeholder)?.excelHeader || null;
}
```

**Tasks:**
- [ ] Design cache schema
- [ ] Implement save/load cache operations
- [ ] Add cache expiration (keep 1 year of data)
- [ ] Create API endpoint: POST /api/report/mapping-cache
- [ ] Integrate caching into matchFieldWithFallback

### 3.3. Usage Analytics

Track success rate per domain:
```typescript
export async function getMappingSuccessRate(domain: string): Promise<number> {
  const cache = await loadMappingCache(domain);
  const avgSuccess = cache.mappings.reduce((sum, m) => sum + m.successCount, 0)
    / cache.mappings.length;
  return Math.min(100, avgSuccess);
}
```

---

## 🔌 PHASE 4: INTEGRATION & OPTIMIZATION (1 ngày)

### 4.1. Update AI Suggest Endpoint

**File:** `src/app/api/report/mapping/suggest/route.ts`

```typescript
export const POST = withErrorHandling(
  withValidatedBody(mappingSuggestSchema, async (body) => {
    const { excelHeaders, wordPlaceholders, fieldHints, includeGrouping } = body;

    const suggestion: MappingSuggestion = {};

    // Dùng multi-stage matching
    for (const placeholder of wordPlaceholders) {
      const result = await matchFieldWithFallback(
        placeholder,
        excelHeaders,
        fieldHints,
        cachedMappings  // Pass cache
      );

      if (result.finalMatch && result.confidence >= 70) {
        suggestion[placeholder] = result.finalMatch;

        // Save to cache nếu thành công
        if (result.confidence > 80) {
          await saveMappingToCache(placeholder, result.finalMatch, "general");
        }
      }
    }

    return NextResponse.json({ ok: true, suggestion });
  })
);
```

**Tasks:**
- [ ] Replace suggestViaAI with matchFieldWithFallback
- [ ] Add caching to suggest endpoint
- [ ] Add logging/analytics
- [ ] Update field hints building logic

### 4.2. UI Improvements

Show matching stages to user:
```typescript
// In AiMappingModal or mapping UI
{result.stages.map((stage) => (
  <div key={stage.name} className="text-xs">
    <span>{stage.name}</span>
    <span>{stage.score}%</span>
    <span>{stage.confidence}</span>
  </div>
))}
```

---

## 📊 EXPECTED RESULTS

| Metric | Before | After |
|--------|--------|-------|
| Accuracy | 30-40% | 70-85% |
| Fields need AI | 100% | 20% |
| AI calls/request | 5-10 | 1-2 |
| Cache hit rate | 0% | 60-70% |
| Speed | Slow (AI) | Fast (cache) |
| Cost | High (API calls) | Low |

---

## ✅ DELIVERABLES

### File 1: `src/lib/report/advanced-field-matcher.ts`
- Multi-stage matching engine
- 4 matching stages + orchestration

### File 2: `src/lib/report/mapping-cache.ts`
- Cache schema & operations
- Save/load cache

### File 3: `src/lib/report/semantic-matcher.ts`
- Semantic similarity logic
- Domain knowledge map

### Updated: `src/app/api/report/mapping/suggest/route.ts`
- Integration with new matcher

### Updated: `src/lib/report/config-schema.ts`
- Extended FieldCatalogItem with aliases, description, domain

---

## 🎯 SUCCESS CRITERIA

- [ ] Multi-stage matching implemented
- [ ] Exact match works 100%
- [ ] Fuzzy match handles Vietnamese correctly
- [ ] Semantic match >70% accuracy
- [ ] Cache system working
- [ ] AI calls reduced to <20% of requests
- [ ] Overall accuracy improved to 70%+
- [ ] Unit tests for each stage
- [ ] Benchmark test with real data

---

## 📝 DEPENDENCIES & ORDER

1. **Phase 1** (Field Hints) → Required for Phase 2 & 3
2. **Phase 2** (Multi-stage) → Required for Phase 4
3. **Phase 3** (Caching) → Can run parallel with Phase 2
4. **Phase 4** (Integration) → After Phase 2 & 3

**Recommend execution order:**
- Day 1: Phase 1 (enrich field hints)
- Day 2: Phase 2 + Phase 3 (in parallel)
- Day 3: Phase 4 (integration & testing)

---

## 💡 TIPS & TRICKS

1. **Start with Finance domain** (most data available)
2. **Reuse existing fuzzy matching** from placeholder-utils.ts (already fixed)
3. **Test with real BCTC data** from Excel file
4. **Build semantic map gradually** (add more synonyms as you discover them)
5. **Use logging** to track which stage is matching best
6. **Validate cache hits** (spot check if cached mappings still correct)
