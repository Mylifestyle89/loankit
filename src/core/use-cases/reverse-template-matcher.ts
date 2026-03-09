import { reverseTagSuggestionSchema, type ReverseTagSuggestion } from "@/lib/report/config-schema";

type ExcelCell = {
  header: string;
  value: string;
};

type ParagraphInput = {
  index: number;
  text: string;
};

type Candidate = {
  header: string;
  value: string;
  paragraphIndex: number;
  originalText: string;
  contextSnippet: string;
  proposedTag: string;
  lexicalScore: number;
  semanticScore: number;
  formatScore: number;
  proximityScore: number;
  confidenceScore: number;
  normalizedSignals: string[];
};

const VI_SYNONYMS: Record<string, string[]> = {
  amount_number: ["so tien bang so", "so tien", "gia tri", "tong tien", "han muc"],
  amount_text: ["so tien bang chu", "bang chu", "viet bang chu"],
  date: ["ngay", "thang", "nam", "ngay thang nam", "ngay ky", "ngay lap"],
  contract_id: ["so hdtd", "so hop dong", "ma hop dong", "hdtd"],
};

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTagKey(input: string): string {
  return normalizeText(input).replace(/\s+/g, "_");
}

function normalizeDateVariants(input: string): string {
  const raw = normalizeText(input);
  if (!raw) return "";
  const slash = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (slash) {
    const dd = slash[1].padStart(2, "0");
    const mm = slash[2].padStart(2, "0");
    const yyyy = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${dd}/${mm}/${yyyy}`;
  }
  if (raw.includes("ngay") && raw.includes("thang") && raw.includes("nam")) {
    return "dd/mm/yyyy";
  }
  return raw;
}

function normalizeCurrencyVariants(input: string): string {
  const raw = normalizeText(input);
  if (!raw) return "";
  const numeric = raw.replace(/[^\d]/g, "");
  if (numeric) return numeric;
  if (raw.includes("trieu")) return "1000000_text";
  if (raw.includes("ty")) return "1000000000_text";
  return raw;
}

function scoreTokenOverlap(a: string, b: string): number {
  const aTokens = new Set(normalizeText(a).split(" ").filter(Boolean));
  const bTokens = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function semanticSignalScore(text: string, header: string): { score: number; signals: string[] } {
  const normText = normalizeText(text);
  const normHeader = normalizeText(header);
  let score = 0;
  const signals: string[] = [];
  for (const [signalKey, phrases] of Object.entries(VI_SYNONYMS)) {
    const hasPhrase = phrases.some((p) => normText.includes(p) || normHeader.includes(p));
    if (!hasPhrase) continue;
    score += 0.25;
    signals.push(signalKey);
  }
  return { score: Math.min(1, score), signals };
}

function detectFormatScore(header: string, value: string, paragraph: string): number {
  const normHeader = normalizeText(header);
  const normParagraph = normalizeText(paragraph);
  const isDateHint = normHeader.includes("ngay") || normHeader.includes("thang") || normHeader.includes("nam");
  const isAmountHint = normHeader.includes("tien") || normHeader.includes("han muc") || normHeader.includes("gia tri");

  if (isDateHint) {
    const v = normalizeDateVariants(value);
    if (v === "dd/mm/yyyy") return normParagraph.includes("ngay") ? 0.9 : 0.6;
    return normParagraph.includes(v) ? 1 : 0.4;
  }
  if (isAmountHint) {
    const v = normalizeCurrencyVariants(value);
    if (!v) return 0.2;
    if (normParagraph.includes(v)) return 1;
    if (normParagraph.includes("bang chu") && normalizeText(value).includes("dong")) return 0.85;
    return 0.5;
  }
  return scoreTokenOverlap(value, paragraph);
}

function proximityScore(header: string, paragraph: string): number {
  const tokens = normalizeText(header).split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;
  const text = normalizeText(paragraph);
  const matched = tokens.filter((token) => text.includes(token)).length;
  return matched / tokens.length;
}

function buildContextSnippet(text: string, maxLen = 240): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 3)}...`;
}

function computeConfidence(candidate: Omit<Candidate, "confidenceScore">): number {
  const weighted =
    candidate.lexicalScore * 0.25 +
    candidate.semanticScore * 0.3 +
    candidate.formatScore * 0.3 +
    candidate.proximityScore * 0.15;
  return Math.max(0, Math.min(1, Number(weighted.toFixed(4))));
}

export function buildSemanticCandidates(input: {
  excelRows: Array<Record<string, unknown>>;
  paragraphs: ParagraphInput[];
}): Candidate[] {
  const cells: ExcelCell[] = [];
  for (const row of input.excelRows) {
    for (const [header, value] of Object.entries(row)) {
      if (value === null || value === undefined) continue;
      const valueText = String(value).trim();
      if (!valueText) continue;
      cells.push({ header, value: valueText });
    }
  }

  const candidates: Candidate[] = [];
  for (const paragraph of input.paragraphs) {
    for (const cell of cells) {
      const lexicalScore = scoreTokenOverlap(cell.value, paragraph.text);
      const semantic = semanticSignalScore(paragraph.text, cell.header);
      const formatScore = detectFormatScore(cell.header, cell.value, paragraph.text);
      const proxScore = proximityScore(cell.header, paragraph.text);

      // Ignore weak candidates early to reduce conflicts later.
      if (lexicalScore < 0.15 && formatScore < 0.45 && semantic.score < 0.2) continue;

      const partial: Omit<Candidate, "confidenceScore"> = {
        header: cell.header,
        value: cell.value,
        paragraphIndex: paragraph.index,
        originalText: cell.value,
        contextSnippet: buildContextSnippet(paragraph.text),
        proposedTag: `{{${toTagKey(cell.header)}}}`,
        lexicalScore,
        semanticScore: semantic.score,
        formatScore,
        proximityScore: proxScore,
        normalizedSignals: semantic.signals,
      };
      candidates.push({
        ...partial,
        confidenceScore: computeConfidence(partial),
      });
    }
  }
  return candidates;
}

export function selectTopSuggestions(candidates: Candidate[], threshold = 0.55): ReverseTagSuggestion[] {
  const byHeader = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const list = byHeader.get(candidate.header) ?? [];
    list.push(candidate);
    byHeader.set(candidate.header, list);
  }

  const selected: ReverseTagSuggestion[] = [];
  const usedParagraphs = new Set<number>();
  for (const list of byHeader.values()) {
    list.sort((a, b) => b.confidenceScore - a.confidenceScore || a.paragraphIndex - b.paragraphIndex);
    const best = list.find((item) => item.confidenceScore >= threshold && !usedParagraphs.has(item.paragraphIndex));
    if (!best) continue;
    usedParagraphs.add(best.paragraphIndex);
    const parsed = reverseTagSuggestionSchema.parse({
      originalText: best.originalText,
      proposedTag: best.proposedTag,
      contextSnippet: best.contextSnippet,
      confidenceScore: best.confidenceScore,
      paragraphIndex: best.paragraphIndex,
      sourceHeader: best.header,
      normalizedSignals: best.normalizedSignals,
    });
    selected.push(parsed);
  }
  selected.sort((a, b) => b.confidenceScore - a.confidenceScore);
  return selected;
}

