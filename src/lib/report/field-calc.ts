/**
 * Thư viện tính toán cho field: biểu thức số học, hàm tổng hợp, đọc số thành chữ tiếng Việt.
 * Dùng cho mapping, export DOCX, và hiển thị.
 */

// --- Chuyển giá trị raw sang number (hỗ trợ format VN: 1.234,56) ---

export function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (cleaned === "") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toNumberOrZero(raw: unknown): number {
  const n = toNumber(raw);
  return n ?? 0;
}

// --- Hàm tổng hợp (dùng cho mảng giá trị / repeater) ---

/** Trích danh sách số từ mảng (bỏ null/undefined/không phải số). */
export function extractNumbers(values: unknown[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    const n = toNumber(v);
    if (n !== null) out.push(n);
  }
  return out;
}

export function sum(values: unknown[]): number {
  return extractNumbers(values).reduce((a, b) => a + b, 0);
}

export function average(values: unknown[]): number {
  const nums = extractNumbers(values);
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function min(values: unknown[]): number | null {
  const nums = extractNumbers(values);
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

export function max(values: unknown[]): number | null {
  const nums = extractNumbers(values);
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

// --- Biểu thức số học (+, -, *, /) với context là object field key -> value ---

const OP_ADD = "+";
const OP_SUB = "-";
const OP_MUL = "*";
const OP_DIV = "/";
const LP = "(";
const RP = ")";
const COMMA = ",";

type Token = { type: "num"; value: number } | { type: "id"; name: string } | { type: "op"; value: string };

function tokenize(expr: string): Token[] {
  const s = expr.replace(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === LP) {
      tokens.push({ type: "op", value: LP });
      i += 1;
      continue;
    }
    if (s[i] === RP) {
      tokens.push({ type: "op", value: RP });
      i += 1;
      continue;
    }
    if (s[i] === COMMA) {
      tokens.push({ type: "op", value: COMMA });
      i += 1;
      continue;
    }
    if (["+", "-", "*", "/"].includes(s[i])) {
      tokens.push({ type: "op", value: s[i] });
      i += 1;
      continue;
    }
    if (/\d/.test(s[i]) || s[i] === ".") {
      let num = "";
      while (i < s.length && /[\d.]/.test(s[i])) {
        num += s[i];
        i += 1;
      }
      const n = parseFloat(num);
      if (!Number.isNaN(n)) tokens.push({ type: "num", value: n });
      continue;
    }
    // Identifier: chữ (Unicode, kể cả tiếng Việt), số, gạch dưới, chấm — dùng được alias dạng "Doanh_thu_thuần"
    if (/[\p{L}_.]/u.test(s[i])) {
      let id = "";
      while (i < s.length && /[\p{L}\p{N}_.]/u.test(s[i])) {
        id += s[i];
        i += 1;
      }
      tokens.push({ type: "id", name: id });
      continue;
    }
    i += 1;
  }
  return tokens;
}

function getValue(context: Record<string, unknown>, key: string): number | null {
  let raw = context[key];
  if (raw !== undefined) return toNumber(raw);
  // Cho phép gõ alias bằng gạch dưới trong công thức dù trong context key dùng khoảng trắng
  const keyWithSpaces = key.replace(/_/g, " ");
  raw = context[keyWithSpaces];
  return raw !== undefined ? toNumber(raw) : null;
}

/** Đánh giá biểu thức đơn giản: số, tên field, + - * / và dấu ngoặc. Trả về null nếu lỗi. */
export function evaluateExpression(
  expression: string,
  context: Record<string, unknown>,
): number | null {
  const tokens = tokenize(expression);
  if (tokens.length === 0) return null;

  let pos = 0;

  function roundExcel(value: number, digits: number): number {
    const factor = Math.pow(10, digits);
    const shifted = value * factor;
    const rounded =
      shifted >= 0 ? Math.floor(shifted + 0.5) : Math.ceil(shifted - 0.5);
    return rounded / factor;
  }

  function roundUpExcel(value: number, digits: number): number {
    const factor = Math.pow(10, digits);
    const shifted = value * factor;
    const rounded = shifted >= 0 ? Math.ceil(shifted) : Math.floor(shifted);
    return rounded / factor;
  }

  function roundDownExcel(value: number, digits: number): number {
    const factor = Math.pow(10, digits);
    const shifted = value * factor;
    const rounded = shifted >= 0 ? Math.floor(shifted) : Math.ceil(shifted);
    return rounded / factor;
  }

  function parseFunctionCall(name: string, args: number[]): number | null {
    const fn = name.toUpperCase();
    const first = args[0];
    const second = args[1] ?? 0;
    if (first === undefined) return null;
    if (fn === "ROUND") return roundExcel(first, second);
    if (fn === "ROUNDUP") return roundUpExcel(first, second);
    if (fn === "ROUNDDOWN") return roundDownExcel(first, second);
    return null;
  }
  function parseExpr(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (pos < tokens.length) {
      const t = tokens[pos];
      if (t.type !== "op") break;
      if (t.value === OP_ADD) {
        pos += 1;
        const right = parseTerm();
        if (right === null) return null;
        left = left + right;
        continue;
      }
      if (t.value === OP_SUB) {
        pos += 1;
        const right = parseTerm();
        if (right === null) return null;
        left = left - right;
        continue;
      }
      break;
    }
    return left;
  }

  function parseTerm(): number | null {
    let left = parseFactor();
    if (left === null) return null;
    while (pos < tokens.length) {
      const t = tokens[pos];
      if (t.type !== "op") break;
      if (t.value === OP_MUL) {
        pos += 1;
        const right = parseFactor();
        if (right === null) return null;
        left = left * right;
        continue;
      }
      if (t.value === OP_DIV) {
        pos += 1;
        const right = parseFactor();
        if (right === null) return null;
        if (right === 0) return null;
        left = left / right;
        continue;
      }
      break;
    }
    return left;
  }

  function parseFactor(): number | null {
    if (pos >= tokens.length) return null;
    const t = tokens[pos];
    if (t.type === "num") {
      pos += 1;
      return t.value;
    }
    if (t.type === "id") {
      pos += 1;
      const nextToken = tokens[pos];
      if (nextToken && nextToken.type === "op" && nextToken.value === LP) {
        // Function call: NAME(arg1,arg2,...)
        pos += 1; // skip LP
        const args: number[] = [];
        const closeImmediately = tokens[pos];
        if (closeImmediately && closeImmediately.type === "op" && closeImmediately.value === RP) {
          pos += 1;
          return parseFunctionCall(t.name, args);
        }
        while (pos < tokens.length) {
          const arg = parseExpr();
          if (arg === null) return null;
          args.push(arg);
          const sep = tokens[pos];
          if (sep && sep.type === "op" && sep.value === COMMA) {
            pos += 1;
            continue;
          }
          if (sep && sep.type === "op" && sep.value === RP) {
            pos += 1;
            break;
          }
          return null;
        }
        return parseFunctionCall(t.name, args);
      }
      const v = getValue(context, t.name);
      return v ?? 0;
    }
    if (t.type === "op" && t.value === LP) {
      pos += 1;
      const v = parseExpr();
      if (v === null) return null;
      const nextToken = tokens[pos];
      if (nextToken && nextToken.type === "op" && nextToken.value === RP) pos += 1;
      return v;
    }
    if (t.type === "op" && t.value === OP_SUB) {
      pos += 1;
      const v = parseFactor();
      return v === null ? null : -v;
    }
    return null;
  }

  const result = parseExpr();
  return result;
}

type DateUnit = "d" | "m" | "y";
type ResolvedDateTerm =
  | { kind: "date"; value: Date }
  | { kind: "number"; value: number }
  | { kind: "duration"; value: { amount: number; unit: DateUnit } };

function toValidUtcDate(year: number, month: number, day: number): Date | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

export function parseDateLike(raw: unknown): Date | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()));
  }
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;

  // dd/mm/yyyy
  let m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    return toValidUtcDate(year, month, day);
  }

  // yyyy-mm-dd
  m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    return toValidUtcDate(year, month, day);
  }

  // dd-mm-yyyy
  m = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    return toValidUtcDate(year, month, day);
  }

  return null;
}

export function formatDateDdMmYyyy(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function daysInMonthUtc(year: number, monthOneBased: number): number {
  return new Date(Date.UTC(year, monthOneBased, 0)).getUTCDate();
}

function addMonthsClamped(date: Date, amount: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const totalMonths = year * 12 + (month - 1) + amount;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthOneBased = (totalMonths % 12 + 12) % 12 + 1;
  const targetDay = Math.min(day, daysInMonthUtc(targetYear, targetMonthOneBased));
  return new Date(Date.UTC(targetYear, targetMonthOneBased - 1, targetDay));
}

function addDateByUnit(date: Date, amount: number, unit: DateUnit): Date {
  if (unit === "d") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount));
  }
  if (unit === "m") {
    return addMonthsClamped(date, amount);
  }
  // year
  return addMonthsClamped(date, amount * 12);
}

function dateDiffDays(left: Date, right: Date): number {
  const ms = left.getTime() - right.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function normalizeDateUnit(rawUnit: string): DateUnit | null {
  const unit = rawUnit.trim().toLowerCase();
  if (unit === "d" || unit === "day" || unit === "days" || unit === "ngay" || unit === "ngày") return "d";
  if (unit === "m" || unit === "month" || unit === "months" || unit === "thang" || unit === "tháng") return "m";
  if (unit === "y" || unit === "year" || unit === "years" || unit === "nam" || unit === "năm") return "y";
  return null;
}

function resolveDateTerm(rawTerm: string, context: Record<string, unknown>): ResolvedDateTerm | null {
  const term = rawTerm.trim();
  if (!term) return null;

  const fromContext = context[term] ?? context[term.replace(/_/g, " ")];
  if (fromContext !== undefined) {
    const d = parseDateLike(fromContext);
    if (d) return { kind: "date", value: d };
    const n = toNumber(fromContext);
    if (n !== null) return { kind: "number", value: n };
  }

  const literalDate = parseDateLike(term);
  if (literalDate) return { kind: "date", value: literalDate };

  const durationMatch = term.match(/^([+-]?\d+)\s*(d|day|days|ngay|ngày|m|month|months|thang|tháng|y|year|years|nam|năm)$/iu);
  if (durationMatch) {
    const amount = Number(durationMatch[1]);
    const unit = normalizeDateUnit(durationMatch[2]);
    if (unit) return { kind: "duration", value: { amount, unit } };
  }

  const n = toNumber(term);
  if (n !== null) return { kind: "number", value: n };

  return null;
}

/**
 * Date formula (chỉ + / -):
 * - date + 10d|2m|1y => date (dd/mm/yyyy)
 * - date - 10d|2m|1y => date (dd/mm/yyyy)
 * - date - date => số ngày
 */
export function evaluateDateExpression(
  expression: string,
  context: Record<string, unknown>,
): string | number | null {
  const expr = expression.trim();
  if (!expr) return null;
  if (expr.includes("*") || expr.includes("/")) return null;

  const parts = expr.split(/([+-])/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  let current = resolveDateTerm(parts[0], context);
  if (!current || current.kind === "duration") return null;

  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i];
    const rightRaw = parts[i + 1];
    if (!rightRaw || (op !== "+" && op !== "-")) return null;
    const right = resolveDateTerm(rightRaw, context);
    if (!right) return null;

    if (current.kind === "date") {
      if (right.kind === "duration") {
        const delta = op === "+" ? right.value.amount : -right.value.amount;
        current = {
          kind: "date",
          value: addDateByUnit(current.value, delta, right.value.unit),
        };
        continue;
      }
      if (right.kind === "date" && op === "-") {
        current = { kind: "number", value: dateDiffDays(current.value, right.value) };
        continue;
      }
      return null;
    }

    if (current.kind === "number" && right.kind === "number") {
      current = {
        kind: "number",
        value: op === "+" ? current.value + right.value : current.value - right.value,
      };
      continue;
    }

    return null;
  }

  if (current.kind === "date") return formatDateDdMmYyyy(current.value);
  return current.value;
}

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

// --- Đọc số thành chữ tiếng Việt ---

const ONES = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const TEENS = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
const TENS = ["", "", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];

function readBlock3(n: number, suffix: string): string {
  if (n === 0) return "";
  const a = Math.floor(n / 100);
  const b = Math.floor((n % 100) / 10);
  const c = n % 10;
  let s = "";
  if (a > 0) s += ONES[a] + " trăm ";
  if (b >= 2) {
    s += TENS[b];
    if (c === 1) s += " mốt";
    else if (c === 5) s += " lăm";
    else if (c > 0) s += " " + ONES[c];
  } else if (b === 1) {
    s += TEENS[c];
  } else if (c > 0) {
    if (a > 0) s += "lẻ ";
    s += ONES[c];
  }
  return (s.trim() + " " + suffix).trim();
}

function normalizeNumericText(raw: number | string): string | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return String(raw);
  }
  const text = raw.trim().replace(/\s+/g, "");
  if (!text) return null;

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;

  // Case phổ biến VN: 1.234.567,89
  if (unsigned.includes(",") && unsigned.includes(".")) {
    const normalized = unsigned.replace(/\./g, "").replace(",", ".");
    return negative ? `-${normalized}` : normalized;
  }

  // Chỉ có dấu phẩy: coi là phân cách thập phân
  if (unsigned.includes(",")) {
    const normalized = unsigned.replace(",", ".");
    return negative ? `-${normalized}` : normalized;
  }

  // Chỉ có dấu chấm:
  // - Nhiều dấu chấm -> coi là phân cách nghìn
  // - Một dấu chấm -> giữ nguyên (thập phân)
  if ((unsigned.match(/\./g) ?? []).length > 1) {
    const normalized = unsigned.replace(/\./g, "");
    return negative ? `-${normalized}` : normalized;
  }

  return negative ? `-${unsigned}` : unsigned;
}

function readIntegerVi(intPart: number): string {
  if (intPart === 0) return "không";
  const blocks: number[] = [];
  let x = intPart;
  while (x > 0) {
    blocks.push(x % 1000);
    x = Math.floor(x / 1000);
  }
  const units = ["", "nghìn", "triệu", "tỉ", "nghìn tỉ", "triệu tỉ"];
  const parts: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const u = units[i] || "";
    const part = readBlock3(blocks[i], u);
    if (part) parts.unshift(part);
  }
  return parts.join(" ");
}

/**
 * Đọc số tiếng Việt (hỗ trợ cả thập phân).
 * Ví dụ:
 * - 1234567 -> "một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy"
 * - 12,05 -> "mười hai phẩy không năm"
 */
export function docso(value: number | string): string {
  const normalized = normalizeNumericText(value);
  if (!normalized) return "";

  const n = Number(normalized);
  if (!Number.isFinite(n)) return "";

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [intStrRaw, fracStrRaw = ""] = unsigned.split(".");
  const intStr = intStrRaw === "" ? "0" : intStrRaw;
  const intPart = Number(intStr);
  if (!Number.isFinite(intPart)) return "";

  const intWords = readIntegerVi(Math.floor(intPart));

  let result = intWords;
  if (fracStrRaw.length > 0) {
    const digitWords = fracStrRaw
      .split("")
      .map((ch) => {
        const d = Number(ch);
        return Number.isInteger(d) && d >= 0 && d <= 9 ? ONES[d] || "không" : "";
      })
      .filter(Boolean)
      .join(" ");
    if (digitWords) {
      result += ` phẩy ${digitWords}`;
    }
  }

  return negative ? `âm ${result}` : result;
}

/**
 * Đọc số tiếng Việt + đơn vị.
 * Ví dụ: docsocodonvi(1500000, "đồng")
 */
export function docsocodonvi(
  value: number | string,
  unit: string = "đồng",
): string {
  const words = docso(value);
  if (!words) return "";
  return `${words} ${unit}`;
}

// Backward-compatible alias (không phá code cũ)
export const numberToWordsVi = docso;
export const numberToWordsViWithUnit = docsocodonvi;
