/**
 * Field calculation utilities — re-exports from split modules.
 */
export { toNumber, toNumberOrZero, extractNumbers, sum, average, min, max } from "./field-calc-numeric-utils";
export { evaluateExpression } from "./field-calc-expression-evaluator";
export { parseDateLike, formatDateDdMmYyyy, evaluateDateExpression } from "./field-calc-date-utils";
export { evaluateFieldFormula } from "./field-calc-formula-evaluator";
export { docso, docsocodonvi, numberToWordsVi, numberToWordsViWithUnit } from "./field-calc-number-to-words-vn";
