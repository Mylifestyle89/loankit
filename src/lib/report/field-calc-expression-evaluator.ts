/**
 * Arithmetic expression evaluator for field calculations.
 * Supports: numbers, field identifiers, + - * /, parentheses, ROUND/ROUNDUP/ROUNDDOWN.
 */

import { toNumber } from "./field-calc-numeric-utils";

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
