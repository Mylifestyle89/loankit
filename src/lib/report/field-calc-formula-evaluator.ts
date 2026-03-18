/**
 * Formula evaluator for field calculations.
 * Handles: DOCSO, DOCSOCODONVI (word formulas), SUM/AVERAGE/MIN/MAX (aggregate),
 * and numeric/date expressions via evaluateExpression / evaluateDateExpression.
 */

import { toNumber, sum, average, min, max } from "./field-calc-numeric-utils";
import { evaluateExpression } from "./field-calc-expression-evaluator";
import { evaluateDateExpression, formatDateDdMmYyyy, parseDateLike } from "./field-calc-date-utils";
import { docso, docsocodonvi } from "./field-calc-number-to-words-vn";

// Re-export date utils used externally via this module (keep public surface)
export { formatDateDdMmYyyy, parseDateLike };

function splitTopLevelArgs(raw: string): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if ((ch === '"' || ch === "'") && raw[i - 1] !== "\\") {
      if (quote === ch) quote = null;
      else if (!quote) quote = ch;
      current += ch;
      continue;
    }
    if (!quote) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth = Math.max(0, depth - 1);
      if (ch === "," && depth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function stripQuotes(text: string): string {
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function resolveFormulaArg(rawArg: string, context: Record<string, unknown>): unknown {
  const arg = rawArg.trim();
  if (!arg) return null;
  const quoted = stripQuotes(arg);
  if (quoted !== arg) return quoted;

  const fromContext = context[arg] ?? context[arg.replace(/_/g, " ")];
  if (fromContext !== undefined) return fromContext;

  // Only try expression evaluation if arg has no spaces — tokenizer strips spaces
  // which mangles multi-word field names like "Tổng giá trị TSBĐ" into garbage
  if (!arg.includes(" ")) {
    const n = evaluateExpression(arg, context);
    if (n !== null) return n;
  }

  const numericLiteral = toNumber(arg);
  if (numericLiteral !== null) return numericLiteral;
  return null;
}

function evaluateWordFormula(
  expression: string,
  context: Record<string, unknown>,
): string | null {
  const match = expression.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/u);
  if (!match) return null;
  const fn = match[1].toUpperCase();
  const args = splitTopLevelArgs(match[2]);

  if (fn === "DOCSO") {
    if (args.length < 1) return null;
    const source = resolveFormulaArg(args[0], context);
    if (source === null || source === undefined) return null;
    return docso(String(source));
  }

  if (fn === "DOCSOCODONVI") {
    if (args.length < 1) return null;
    const source = resolveFormulaArg(args[0], context);
    if (source === null || source === undefined) return null;
    const unitRaw = args[1] ? resolveFormulaArg(args[1], context) : "đồng";
    const unit = unitRaw === null || unitRaw === undefined ? "đồng" : String(unitRaw);
    return docsocodonvi(String(source), unit);
  }

  return null;
}

/**
 * Evaluate aggregate functions: SUM, AVERAGE, MIN, MAX
 * Parse bằng regex để giữ nguyên tên field có dấu cách (ví dụ: "Giá trị tài sản bảo đảm")
 */
function evaluateAggregateFormula(
  expression: string,
  context: Record<string, unknown>,
): number | null {
  const match = expression.trim().match(/^(sum|average|min|max)\s*\(\s*(.*?)\s*\)$/iu);
  if (!match) return null;

  const fn = match[1].toUpperCase();
  const argName = match[2].trim();
  if (!argName) return null;

  // Resolve argument: tìm array value trong context
  const resolved = context[argName] ?? context[argName.replace(/_/g, " ")];
  if (!Array.isArray(resolved)) return null;

  if (fn === "SUM") return sum(resolved);
  if (fn === "AVERAGE") return average(resolved);
  if (fn === "MIN") return min(resolved);
  if (fn === "MAX") return max(resolved);
  return null;
}

export function evaluateFieldFormula(
  expression: string,
  context: Record<string, unknown>,
  fieldType: string,
): string | number | null {
  if (fieldType === "date") {
    return evaluateDateExpression(expression, context);
  }
  if (fieldType === "text") {
    return evaluateWordFormula(expression, context);
  }
  // Thử aggregate functions trước (SUM, AVERAGE, MIN, MAX)
  const aggregate = evaluateAggregateFormula(expression, context);
  if (aggregate !== null) return aggregate;
  const numeric = evaluateExpression(expression, context);
  if (numeric !== null) return numeric;
  // Cho phép field số nhận kết quả "date - date" theo số ngày
  const dateAware = evaluateDateExpression(expression, context);
  return typeof dateAware === "number" ? dateAware : null;
}
